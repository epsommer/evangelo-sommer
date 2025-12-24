/**
 * Notion Calendar Sync - Pull Endpoint
 * Polls Notion database for calendar event changes
 *
 * Note: Notion doesn't support webhooks for databases, so we use polling
 * Recommended: Call this endpoint every 1-2 minutes via cron job
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/prisma'
import { Client } from '@notionhq/client'
import { decrypt } from '@/lib/encryption'
import type { UnifiedEvent } from '@/components/EventCreationModal'

/**
 * Pull events from Notion database
 */
export async function POST(request: NextRequest) {
  try {
    const { integrationId, databaseId } = await request.json()

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration ID required' },
        { status: 400 }
      )
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      )
    }

    // Get Notion integration
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId }
    })

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      )
    }

    if (integration.provider !== 'NOTION') {
      return NextResponse.json(
        { success: false, error: 'Integration is not Notion' },
        { status: 400 }
      )
    }

    // Decrypt Notion access token
    const accessToken = decrypt(integration.accessToken)

    // Initialize Notion client
    const notion = new Client({ auth: accessToken })

    // Determine which database to query
    const targetDatabaseId = databaseId || integration.externalId

    if (!targetDatabaseId) {
      return NextResponse.json(
        { success: false, error: 'No Notion database ID configured' },
        { status: 400 }
      )
    }

    // Query Notion database for events
    // Only fetch pages modified since last sync
    const lastSync = integration.lastSyncAt || new Date(0)

    const response = await (notion.databases as any).query({
      database_id: targetDatabaseId,
      filter: {
        and: [
          {
            timestamp: 'last_edited_time',
            last_edited_time: {
              on_or_after: lastSync.toISOString()
            }
          }
        ]
      },
      sorts: [
        {
          timestamp: 'last_edited_time',
          direction: 'ascending'
        }
      ]
    })

    // Convert Notion pages to UnifiedEvents
    const events: UnifiedEvent[] = []
    const conflicts: string[] = []

    for (const page of response.results) {
      try {
        const unifiedEvent = convertNotionPageToEvent(page as any)
        events.push(unifiedEvent)

        // Check if event exists locally and has been modified
        const localEvent = await prisma.event.findFirst({
          where: {
            OR: [
              { id: unifiedEvent.id },
              {
                eventSyncs: {
                  some: {
                    integrationId,
                    externalId: page.id
                  }
                }
              }
            ]
          },
          include: {
            eventSyncs: {
              where: { integrationId }
            }
          }
        })

        if (localEvent) {
          // Check for conflict
          const notionModified = new Date((page as any).last_edited_time)
          const localModified = localEvent.updatedAt

          if (localEvent.eventSyncs.length > 0) {
            const lastSyncTime = localEvent.eventSyncs[0].lastSyncAt
            if (lastSyncTime && localModified > lastSyncTime && notionModified > lastSyncTime) {
              // Conflict detected
              conflicts.push(unifiedEvent.id)
              console.warn('📅 [NotionSync] Conflict detected for event:', unifiedEvent.id)
            }
          }

          // Update local event (last-write-wins strategy)
          await prisma.event.update({
            where: { id: localEvent.id },
            data: {
              title: unifiedEvent.title,
              description: unifiedEvent.description,
              startDateTime: unifiedEvent.startDateTime,
              endDateTime: unifiedEvent.endDateTime,
              location: unifiedEvent.location,
              notes: unifiedEvent.notes
            }
          })

          // Update sync record
          await prisma.eventSync.upsert({
            where: {
              eventId_integrationId: {
                eventId: localEvent.id,
                integrationId
              }
            },
            create: {
              eventId: localEvent.id,
              integrationId,
              provider: 'NOTION',
              externalId: page.id,
              syncStatus: 'SYNCED',
              lastSyncAt: new Date(),
              localVersion: localModified,
              remoteVersion: notionModified
            },
            update: {
              syncStatus: 'SYNCED',
              lastSyncAt: new Date(),
              remoteVersion: notionModified
            }
          })
        } else {
          // Create new local event
          const newEvent = await prisma.event.create({
            data: {
              type: 'EVENT',
              title: unifiedEvent.title,
              description: unifiedEvent.description,
              startDateTime: unifiedEvent.startDateTime,
              endDateTime: unifiedEvent.endDateTime,
              duration: unifiedEvent.duration || 60,
              priority: 'MEDIUM',
              location: unifiedEvent.location,
              notes: unifiedEvent.notes,
              isAllDay: unifiedEvent.isAllDay || false,
              isMultiDay: unifiedEvent.isMultiDay || false,
              isRecurring: false
            }
          })

          // Create sync record
          await prisma.eventSync.create({
            data: {
              eventId: newEvent.id,
              integrationId,
              provider: 'NOTION',
              externalId: page.id,
              syncStatus: 'SYNCED',
              lastSyncAt: new Date(),
              localVersion: new Date(),
              remoteVersion: new Date((page as any).last_edited_time)
            }
          })
        }
      } catch (error) {
        console.error('📅 [NotionSync] Error processing page:', page.id, error)
      }
    }

    // Update integration last sync time
    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: null
      }
    })

    console.log(`📅 [NotionSync] Pulled ${events.length} events, ${conflicts.length} conflicts`)

    return NextResponse.json({
      success: true,
      events,
      conflicts,
      syncedAt: new Date().toISOString(),
      count: events.length
    })

  } catch (error) {
    console.error('📅 [NotionSync] Pull error:', error)

    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to pull from Notion',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    )
  }
}

/**
 * Convert Notion page to UnifiedEvent
 * Assumes Notion database has these properties:
 * - Title (title)
 * - Date (date)
 * - Description (rich_text)
 * - Location (rich_text)
 * - Notes (rich_text)
 */
function convertNotionPageToEvent(page: any): UnifiedEvent {
  const properties = page.properties

  // Extract title
  const titleProp = properties.Title || properties.Name || properties.title || properties.name
  const title = titleProp?.title?.[0]?.plain_text || 'Untitled Event'

  // Extract date
  const dateProp = properties.Date || properties.date
  const startDateTime = dateProp?.date?.start || new Date().toISOString()
  const endDateTime = dateProp?.date?.end || startDateTime

  // Extract description
  const descProp = properties.Description || properties.description
  const description = descProp?.rich_text?.[0]?.plain_text || ''

  // Extract location
  const locProp = properties.Location || properties.location
  const location = locProp?.rich_text?.[0]?.plain_text || undefined

  // Extract notes
  const notesProp = properties.Notes || properties.notes
  const notes = notesProp?.rich_text?.[0]?.plain_text || undefined

  // Calculate duration
  const start = new Date(startDateTime)
  const end = new Date(endDateTime)
  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

  return {
    id: `notion-${page.id}`,
    type: 'event',
    title,
    description,
    startDateTime,
    endDateTime,
    duration: duration || 60,
    priority: 'medium',
    location,
    notes,
    isAllDay: !dateProp?.date?.start?.includes('T'),
    isMultiDay: dateProp?.date?.end ? startDateTime.split('T')[0] !== endDateTime.split('T')[0] : false,
    isRecurring: false,
    status: 'scheduled',
    createdAt: page.created_time,
    updatedAt: page.last_edited_time
  } as UnifiedEvent
}

/**
 * Get all available Notion databases for an integration
 * Helps users configure which database to sync
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get('integrationId')

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration ID required' },
        { status: 400 }
      )
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      )
    }

    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId }
    })

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      )
    }

    const accessToken = decrypt(integration.accessToken)
    const notion = new Client({ auth: accessToken })

    // Search for databases
    const response = await notion.search({
      filter: { property: 'object', value: 'database' as any }
    }) as any

    const databases = response.results.map((db: any) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled Database',
      url: db.url,
      createdTime: db.created_time,
      lastEditedTime: db.last_edited_time
    }))

    return NextResponse.json({
      success: true,
      databases
    })

  } catch (error) {
    console.error('📅 [NotionSync] Error fetching databases:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Notion databases'
      },
      { status: 500 }
    )
  }
}
