/**
 * Sync Queue Processor API Endpoint
 * Processes pending sync operations with retry logic
 *
 * Should be called by:
 * 1. Cron job (every 1-5 minutes)
 * 2. Manual trigger from admin panel
 * 3. After failed sync operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/prisma'
import { CalendarSyncService } from '@/lib/calendar-sync'

/**
 * Process sync queue
 * GET: Check queue status
 * POST: Process pending queue items
 */
export async function GET(request: NextRequest) {
  try {
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      )
    }

    // Get queue statistics
    const stats = await prisma.syncQueue.groupBy({
      by: ['status'],
      _count: true
    })

    const oldestPending = await prisma.syncQueue.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({
      success: true,
      stats: stats.reduce((acc, { status, _count }) => {
        acc[status] = _count
        return acc
      }, {} as Record<string, number>),
      oldestPendingAge: oldestPending
        ? Date.now() - oldestPending.createdAt.getTime()
        : null
    })
  } catch (error) {
    console.error('📅 [SyncQueue] Error fetching queue stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch queue stats' },
      { status: 500 }
    )
  }
}

/**
 * Process pending sync operations
 */
export async function POST(request: NextRequest) {
  try {
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      )
    }

    // Get request parameters
    const body = await request.json().catch(() => ({}))
    const batchSize = body.batchSize || 10
    const maxRetries = body.maxRetries || 3

    // Get pending queue items
    const queueItems = await prisma.syncQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: new Date() },
        retryCount: { lt: maxRetries }
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledFor: 'asc' }
      ],
      take: batchSize
    })

    console.log(`📅 [SyncQueue] Processing ${queueItems.length} queue items`)

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retried: 0
    }

    for (const item of queueItems) {
      try {
        // Mark as processing
        await prisma.syncQueue.update({
          where: { id: item.id },
          data: { status: 'PROCESSING' }
        })

        // Process based on operation type
        let success = false

        switch (item.operation) {
          case 'CREATE_EVENT':
          case 'UPDATE_EVENT':
            success = await processEventSync(item, prisma)
            break

          case 'DELETE_EVENT':
            success = await processEventDelete(item, prisma)
            break

          case 'PULL_CHANGES':
            success = await processPullChanges(item, prisma)
            break

          case 'PUSH_CHANGES':
            success = await processPushChanges(item, prisma)
            break

          case 'RESOLVE_CONFLICT':
            success = await processConflictResolution(item, prisma)
            break

          default:
            console.warn('📅 [SyncQueue] Unknown operation:', item.operation)
            success = false
        }

        if (success) {
          // Mark as completed
          await prisma.syncQueue.update({
            where: { id: item.id },
            data: {
              status: 'COMPLETED',
              processedAt: new Date()
            }
          })
          results.succeeded++
        } else {
          // Increment retry count or fail permanently
          const newRetryCount = item.retryCount + 1

          if (newRetryCount >= item.maxRetries) {
            await prisma.syncQueue.update({
              where: { id: item.id },
              data: {
                status: 'FAILED',
                retryCount: newRetryCount,
                processedAt: new Date(),
                lastError: 'Max retries exceeded'
              }
            })
            results.failed++
          } else {
            // Exponential backoff: 2^retryCount minutes
            const backoffMinutes = Math.pow(2, newRetryCount)
            const nextSchedule = new Date(Date.now() + backoffMinutes * 60 * 1000)

            await prisma.syncQueue.update({
              where: { id: item.id },
              data: {
                status: 'PENDING',
                retryCount: newRetryCount,
                scheduledFor: nextSchedule
              }
            })
            results.retried++
          }
        }

        results.processed++
      } catch (error) {
        console.error('📅 [SyncQueue] Error processing item:', item.id, error)

        // Mark as failed or retry
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const newRetryCount = item.retryCount + 1

        await prisma.syncQueue.update({
          where: { id: item.id },
          data: {
            status: newRetryCount >= item.maxRetries ? 'FAILED' : 'PENDING',
            retryCount: newRetryCount,
            lastError: errorMessage,
            scheduledFor: newRetryCount < item.maxRetries
              ? new Date(Date.now() + Math.pow(2, newRetryCount) * 60 * 1000)
              : undefined,
            ...(newRetryCount >= item.maxRetries && { processedAt: new Date() })
          }
        })

        results.processed++
        if (newRetryCount >= item.maxRetries) {
          results.failed++
        } else {
          results.retried++
        }
      }
    }

    console.log('📅 [SyncQueue] Processing complete:', results)

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('📅 [SyncQueue] Queue processing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Queue processing failed'
      },
      { status: 500 }
    )
  }
}

/**
 * Process event create/update sync
 */
async function processEventSync(item: any, prisma: any): Promise<boolean> {
  try {
    const event = item.payload as any

    if (!event.id || !item.integrationId) {
      console.error('📅 [SyncQueue] Invalid event sync payload')
      return false
    }

    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: item.integrationId }
    })

    if (!integration) {
      console.error('📅 [SyncQueue] Integration not found:', item.integrationId)
      return false
    }

    const operation = item.operation === 'CREATE_EVENT' ? 'create' : 'update'
    const results = await CalendarSyncService.pushEventToExternalCalendars(event, operation)

    // Consider success if at least one integration succeeded
    return results.some(r => r.success)
  } catch (error) {
    console.error('📅 [SyncQueue] Event sync error:', error)
    return false
  }
}

/**
 * Process event deletion sync
 */
async function processEventDelete(item: any, prisma: any): Promise<boolean> {
  try {
    const event = item.payload as any

    if (!event.id || !item.integrationId) {
      return false
    }

    const results = await CalendarSyncService.pushEventToExternalCalendars(event, 'delete')
    return results.some(r => r.success)
  } catch (error) {
    console.error('📅 [SyncQueue] Event delete error:', error)
    return false
  }
}

/**
 * Process pull changes from external calendar
 */
async function processPullChanges(item: any, prisma: any): Promise<boolean> {
  try {
    const { startDate, endDate } = item.payload
    const result = await CalendarSyncService.pullEventsFromExternalCalendars(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    )

    console.log(`📅 [SyncQueue] Pulled ${result.events.length} events, ${result.conflicts.length} conflicts`)
    return true
  } catch (error) {
    console.error('📅 [SyncQueue] Pull changes error:', error)
    return false
  }
}

/**
 * Process push changes to external calendar
 */
async function processPushChanges(item: any, prisma: any): Promise<boolean> {
  try {
    // This would sync all local events modified since last sync
    // Implementation depends on your sync strategy
    console.log('📅 [SyncQueue] Push changes not yet implemented')
    return false
  } catch (error) {
    console.error('📅 [SyncQueue] Push changes error:', error)
    return false
  }
}

/**
 * Process conflict resolution
 */
async function processConflictResolution(item: any, prisma: any): Promise<boolean> {
  try {
    const { eventId, resolution } = item.payload

    // Resolution strategies:
    // - 'local': Keep local version
    // - 'remote': Keep remote version
    // - 'merge': Attempt to merge changes

    console.log('📅 [SyncQueue] Conflict resolution not yet implemented')
    return false
  } catch (error) {
    console.error('📅 [SyncQueue] Conflict resolution error:', error)
    return false
  }
}

/**
 * Clear completed queue items (cleanup endpoint)
 */
export async function DELETE(request: NextRequest) {
  try {
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const olderThan = searchParams.get('olderThan') || '7' // days

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan))

    const result = await prisma.syncQueue.deleteMany({
      where: {
        status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        processedAt: { lt: cutoffDate }
      }
    })

    console.log(`📅 [SyncQueue] Cleaned up ${result.count} old queue items`)

    return NextResponse.json({
      success: true,
      deleted: result.count
    })
  } catch (error) {
    console.error('📅 [SyncQueue] Cleanup error:', error)
    return NextResponse.json(
      { success: false, error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}
