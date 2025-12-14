/**
 * Calendar Sync Service
 * Orchestrates bidirectional synchronization between local events and external calendars
 * (Google Calendar, Notion, etc.)
 */

import { getPrismaClient } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/encryption'
import { google } from 'googleapis'
import type { UnifiedEvent } from '@/components/EventCreationModal'
import type { CalendarProvider, SyncStatus, SyncOperation } from '@prisma/client'

export interface SyncResult {
  success: boolean
  provider: string
  externalId?: string
  error?: string
  operation?: string
}

export interface ConflictInfo {
  eventId: string
  localVersion: Date
  remoteVersion: Date
  localChanges: Partial<UnifiedEvent>
  remoteChanges: Partial<UnifiedEvent>
  autoResolvable: boolean
}

/**
 * Main Calendar Sync Service
 */
export class CalendarSyncService {
  /**
   * Push a local event to all active external calendar integrations
   */
  static async pushEventToExternalCalendars(
    event: UnifiedEvent,
    operation: 'create' | 'update' | 'delete' = 'create'
  ): Promise<SyncResult[]> {
    const prisma = getPrismaClient()
    if (!prisma) {
      console.warn('📅 [CalendarSync] No database connection')
      return []
    }

    const results: SyncResult[] = []

    try {
      // Find all active integrations
      const integrations = await prisma.calendarIntegration.findMany({
        where: {
          isActive: true,
          syncDirection: { in: ['BIDIRECTIONAL', 'EXPORT_ONLY'] }
        },
        include: { participant: true }
      })

      console.log(`📅 [CalendarSync] Pushing to ${integrations.length} integration(s)`)

      for (const integration of integrations) {
        let result: SyncResult

        try {
          if (integration.provider === 'GOOGLE') {
            result = await this.syncToGoogleCalendar(event, integration, operation)
          } else if (integration.provider === 'NOTION') {
            result = await this.syncToNotion(event, integration, operation)
          } else {
            result = {
              success: false,
              provider: integration.provider,
              error: `Provider ${integration.provider} not implemented`
            }
          }

          results.push(result)

          // Track sync in EventSync table
          if (result.success && result.externalId && event.id) {
            await this.trackEventSync(
              event.id,
              integration.id,
              integration.provider,
              result.externalId,
              'SYNCED'
            )
          } else if (!result.success) {
            await this.trackEventSync(
              event.id,
              integration.id,
              integration.provider,
              result.externalId || '',
              'ERROR',
              result.error
            )
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.push({
            success: false,
            provider: integration.provider,
            error: errorMessage
          })

          // Queue for retry
          await this.queueSyncOperation({
            operation: operation === 'create' ? 'CREATE_EVENT' : operation === 'update' ? 'UPDATE_EVENT' : 'DELETE_EVENT',
            eventId: event.id,
            integrationId: integration.id,
            payload: event as any,
            priority: 1
          })
        }
      }
    } catch (error) {
      console.error('📅 [CalendarSync] Error pushing to external calendars:', error)
    }

    return results
  }

  /**
   * Pull events from all active external calendar integrations
   */
  static async pullEventsFromExternalCalendars(
    startDate?: Date,
    endDate?: Date
  ): Promise<{ events: UnifiedEvent[]; conflicts: ConflictInfo[] }> {
    const prisma = getPrismaClient()
    if (!prisma) {
      return { events: [], conflicts: [] }
    }

    const events: UnifiedEvent[] = []
    const conflicts: ConflictInfo[] = []

    try {
      const integrations = await prisma.calendarIntegration.findMany({
        where: {
          isActive: true,
          syncDirection: { in: ['BIDIRECTIONAL', 'IMPORT_ONLY'] }
        }
      })

      console.log(`📅 [CalendarSync] Pulling from ${integrations.length} integration(s)`)

      for (const integration of integrations) {
        try {
          if (integration.provider === 'GOOGLE') {
            const result = await this.pullFromGoogleCalendar(integration, startDate, endDate)
            events.push(...result.events)
            conflicts.push(...result.conflicts)
          } else if (integration.provider === 'NOTION') {
            const result = await this.pullFromNotion(integration, startDate, endDate)
            events.push(...result.events)
            conflicts.push(...result.conflicts)
          }
        } catch (error) {
          console.error(`📅 [CalendarSync] Error pulling from ${integration.provider}:`, error)
        }
      }
    } catch (error) {
      console.error('📅 [CalendarSync] Error pulling from external calendars:', error)
    }

    return { events, conflicts }
  }

  /**
   * Sync to Google Calendar
   */
  private static async syncToGoogleCalendar(
    event: UnifiedEvent,
    integration: any,
    operation: 'create' | 'update' | 'delete'
  ): Promise<SyncResult> {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return { success: false, provider: 'GOOGLE', error: 'Google OAuth not configured' }
    }

    try {
      const accessToken = decrypt(integration.accessToken)
      const refreshToken = integration.refreshToken ? decrypt(integration.refreshToken) : null

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      )

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      // Auto-refresh token handling
      const prisma = getPrismaClient()
      oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token && prisma) {
          const encryptedAccessToken = encrypt(tokens.access_token)
          const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined

          await prisma.calendarIntegration.update({
            where: { id: integration.id },
            data: {
              accessToken: encryptedAccessToken,
              ...(encryptedRefreshToken && { refreshToken: encryptedRefreshToken }),
              expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            }
          })
        }
      })

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      const calendarId = integration.externalId || 'primary'

      // Convert event to Google Calendar format
      const googleEvent = this.convertToGoogleEvent(event)

      if (operation === 'create') {
        const response = await calendar.events.insert({
          calendarId,
          requestBody: googleEvent,
        })
        return {
          success: true,
          provider: 'GOOGLE',
          externalId: response.data.id || undefined,
          operation: 'create'
        }
      } else if (operation === 'update') {
        // Get existing Google event ID from EventSync
        const eventSync = await this.getEventSync(event.id, integration.id)
        if (!eventSync?.externalId) {
          // Fall back to create if no sync record exists
          const response = await calendar.events.insert({
            calendarId,
            requestBody: googleEvent,
          })
          return {
            success: true,
            provider: 'GOOGLE',
            externalId: response.data.id || undefined,
            operation: 'create (fallback)'
          }
        }

        const response = await calendar.events.update({
          calendarId,
          eventId: eventSync.externalId,
          requestBody: googleEvent,
        })
        return {
          success: true,
          provider: 'GOOGLE',
          externalId: response.data.id || undefined,
          operation: 'update'
        }
      } else if (operation === 'delete') {
        const eventSync = await this.getEventSync(event.id, integration.id)
        if (eventSync?.externalId) {
          await calendar.events.delete({
            calendarId,
            eventId: eventSync.externalId,
          })
        }
        return {
          success: true,
          provider: 'GOOGLE',
          operation: 'delete'
        }
      }

      return { success: false, provider: 'GOOGLE', error: 'Unknown operation' }
    } catch (error: any) {
      console.error('📅 [GoogleSync] Error:', error)
      return {
        success: false,
        provider: 'GOOGLE',
        error: error.message || 'Google Calendar API error'
      }
    }
  }

  /**
   * Pull events from Google Calendar
   */
  private static async pullFromGoogleCalendar(
    integration: any,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ events: UnifiedEvent[]; conflicts: ConflictInfo[] }> {
    const events: UnifiedEvent[] = []
    const conflicts: ConflictInfo[] = []

    try {
      const accessToken = decrypt(integration.accessToken)
      const refreshToken = integration.refreshToken ? decrypt(integration.refreshToken) : null

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      )

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      const calendarId = integration.externalId || 'primary'

      // Use syncToken for incremental sync if available
      const listParams: any = {
        calendarId,
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime'
      }

      if (integration.syncToken) {
        listParams.syncToken = integration.syncToken
      } else {
        // Full sync with date range
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const end = endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        listParams.timeMin = start.toISOString()
        listParams.timeMax = end.toISOString()
      }

      const response = await calendar.events.list(listParams)

      // Store new syncToken for next incremental sync
      const prisma = getPrismaClient()
      if (response.data.nextSyncToken && prisma) {
        await prisma.calendarIntegration.update({
          where: { id: integration.id },
          data: {
            syncToken: response.data.nextSyncToken,
            lastSyncAt: new Date()
          }
        })
      }

      // Convert Google events to UnifiedEvents and detect conflicts
      for (const googleEvent of response.data.items || []) {
        const unifiedEvent = this.convertFromGoogleEvent(googleEvent)
        events.push(unifiedEvent)

        // Check for conflicts with existing local events
        const conflict = await this.detectConflict(unifiedEvent, integration.id, googleEvent.updated)
        if (conflict) {
          conflicts.push(conflict)
        }
      }
    } catch (error: any) {
      console.error('📅 [GoogleSync] Pull error:', error)
      // Handle invalid syncToken by clearing it and retrying
      if (error.code === 410 && integration.syncToken) {
        const prisma = getPrismaClient()
        if (prisma) {
          await prisma.calendarIntegration.update({
            where: { id: integration.id },
            data: { syncToken: null }
          })
          // Retry without syncToken
          return this.pullFromGoogleCalendar(integration, startDate, endDate)
        }
      }
    }

    return { events, conflicts }
  }

  /**
   * Sync to Notion
   */
  private static async syncToNotion(
    event: UnifiedEvent,
    integration: any,
    operation: 'create' | 'update' | 'delete'
  ): Promise<SyncResult> {
    // TODO: Implement Notion sync
    // Notion doesn't have native calendar support, need to use a database
    return {
      success: false,
      provider: 'NOTION',
      error: 'Notion sync not yet implemented'
    }
  }

  /**
   * Pull events from Notion
   */
  private static async pullFromNotion(
    integration: any,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ events: UnifiedEvent[]; conflicts: ConflictInfo[] }> {
    // TODO: Implement Notion pull
    return { events: [], conflicts: [] }
  }

  /**
   * Convert UnifiedEvent to Google Calendar event format
   */
  private static convertToGoogleEvent(event: UnifiedEvent): any {
    const endDateTime = event.endDateTime || event.startDateTime

    return {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: event.isAllDay
        ? { date: event.startDateTime.split('T')[0] }
        : { dateTime: event.startDateTime, timeZone: 'America/New_York' },
      end: event.isAllDay
        ? { date: endDateTime.split('T')[0] }
        : { dateTime: endDateTime, timeZone: 'America/New_York' },
      // Add participants as attendees if available
      attendees: event.participants?.map(email => ({ email })),
      // Store event ID in extendedProperties for reverse lookup
      extendedProperties: {
        private: {
          localEventId: event.id
        }
      }
    }
  }

  /**
   * Convert Google Calendar event to UnifiedEvent format
   */
  private static convertFromGoogleEvent(googleEvent: any): UnifiedEvent {
    const startDateTime = googleEvent.start?.dateTime || googleEvent.start?.date
    const endDateTime = googleEvent.end?.dateTime || googleEvent.end?.date
    const isAllDay = !googleEvent.start?.dateTime

    return {
      id: googleEvent.extendedProperties?.private?.localEventId || `gcal-${googleEvent.id}`,
      type: 'event',
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || '',
      startDateTime,
      endDateTime: endDateTime || startDateTime,
      duration: this.calculateDuration(startDateTime, endDateTime),
      priority: 'medium',
      location: googleEvent.location,
      isAllDay,
      isMultiDay: false,
      isRecurring: false,
      status: googleEvent.status === 'cancelled' ? 'cancelled' : 'scheduled',
      participants: googleEvent.attendees?.map((a: any) => a.email).filter(Boolean),
      createdAt: googleEvent.created || new Date().toISOString(),
      updatedAt: googleEvent.updated || new Date().toISOString()
    } as UnifiedEvent
  }

  /**
   * Calculate duration in minutes between two datetime strings
   */
  private static calculateDuration(start: string, end: string): number {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
  }

  /**
   * Track event sync in database
   */
  private static async trackEventSync(
    eventId: string,
    integrationId: string,
    provider: CalendarProvider,
    externalId: string,
    syncStatus: SyncStatus,
    error?: string
  ): Promise<void> {
    const prisma = getPrismaClient()
    if (!prisma) return

    try {
      await prisma.eventSync.upsert({
        where: {
          eventId_integrationId: {
            eventId,
            integrationId
          }
        },
        create: {
          eventId,
          integrationId,
          provider,
          externalId,
          syncStatus,
          lastSyncAt: new Date(),
          lastSyncError: error,
          localVersion: new Date(),
          retryCount: 0
        },
        update: {
          syncStatus,
          lastSyncAt: new Date(),
          lastSyncError: error,
          externalId
        }
      })
    } catch (error) {
      console.error('📅 [CalendarSync] Error tracking sync:', error)
    }
  }

  /**
   * Get event sync record
   */
  private static async getEventSync(eventId: string, integrationId: string): Promise<any> {
    const prisma = getPrismaClient()
    if (!prisma) return null

    try {
      return await prisma.eventSync.findUnique({
        where: {
          eventId_integrationId: {
            eventId,
            integrationId
          }
        }
      })
    } catch (error) {
      return null
    }
  }

  /**
   * Detect conflict between local and remote event versions
   */
  private static async detectConflict(
    remoteEvent: UnifiedEvent,
    integrationId: string,
    remoteUpdated?: string
  ): Promise<ConflictInfo | null> {
    const prisma = getPrismaClient()
    if (!prisma || !remoteEvent.id) return null

    try {
      // Find local event
      const localEvent = await prisma.event.findUnique({
        where: { id: remoteEvent.id }
      })

      if (!localEvent) return null

      // Get sync record
      const eventSync = await this.getEventSync(remoteEvent.id, integrationId)
      if (!eventSync) return null

      const localModified = localEvent.updatedAt
      const remoteModified = remoteUpdated ? new Date(remoteUpdated) : new Date()

      // Check if both have been modified since last sync
      if (eventSync.lastSyncAt) {
        const bothModified = localModified > eventSync.lastSyncAt && remoteModified > eventSync.lastSyncAt

        if (bothModified) {
          // Conflict detected
          return {
            eventId: remoteEvent.id,
            localVersion: localModified,
            remoteVersion: remoteModified,
            localChanges: localEvent as any,
            remoteChanges: remoteEvent as any,
            autoResolvable: false // Implement auto-resolve logic based on your needs
          }
        }
      }

      return null
    } catch (error) {
      console.error('📅 [CalendarSync] Error detecting conflict:', error)
      return null
    }
  }

  /**
   * Queue a sync operation for retry
   */
  private static async queueSyncOperation(params: {
    operation: SyncOperation
    eventId?: string
    integrationId?: string
    payload: any
    priority?: number
  }): Promise<void> {
    const prisma = getPrismaClient()
    if (!prisma) return

    try {
      await prisma.syncQueue.create({
        data: {
          operation: params.operation,
          eventId: params.eventId,
          integrationId: params.integrationId,
          payload: params.payload,
          priority: params.priority || 0,
          status: 'PENDING',
          retryCount: 0,
          maxRetries: 3,
          scheduledFor: new Date()
        }
      })
    } catch (error) {
      console.error('📅 [CalendarSync] Error queuing operation:', error)
    }
  }

  /**
   * Process sync queue (should be called by a background job)
   */
  static async processSyncQueue(): Promise<void> {
    const prisma = getPrismaClient()
    if (!prisma) return

    try {
      // Get pending queue items
      const queueItems = await prisma.syncQueue.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: new Date() },
          retryCount: { lt: prisma.$queryRaw`"maxRetries"` }
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledFor: 'asc' }
        ],
        take: 10
      })

      for (const item of queueItems) {
        try {
          // Mark as processing
          await prisma.syncQueue.update({
            where: { id: item.id },
            data: { status: 'PROCESSING' }
          })

          // Process based on operation type
          // TODO: Implement operation handlers

          // Mark as completed
          await prisma.syncQueue.update({
            where: { id: item.id },
            data: {
              status: 'COMPLETED',
              processedAt: new Date()
            }
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          // Increment retry count
          await prisma.syncQueue.update({
            where: { id: item.id },
            data: {
              status: 'PENDING',
              retryCount: { increment: 1 },
              lastError: errorMessage,
              scheduledFor: new Date(Date.now() + Math.pow(2, item.retryCount) * 60000) // Exponential backoff
            }
          })
        }
      }
    } catch (error) {
      console.error('📅 [CalendarSync] Error processing queue:', error)
    }
  }
}
