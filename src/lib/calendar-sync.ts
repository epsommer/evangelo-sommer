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
      // Decrypt tokens with graceful error handling
      let accessToken: string
      let refreshToken: string | null = null

      try {
        accessToken = decrypt(integration.accessToken)
        refreshToken = integration.refreshToken ? decrypt(integration.refreshToken) : null
      } catch (decryptError) {
        console.warn('📅 [GoogleSync] Token decryption failed - integration may need to be reconnected')
        return {
          success: false,
          provider: 'GOOGLE',
          error: 'Calendar integration tokens are invalid or corrupted. Please reconnect your Google Calendar.'
        }
      }

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

        // Handle case where no EventSync record exists
        if (!eventSync?.externalId) {
          console.warn(`📅 [GoogleSync] No EventSync record for event ${event.id}, cannot delete from Google Calendar`)
          return {
            success: false,
            provider: 'GOOGLE',
            error: 'Event not synced to Google Calendar (no sync record)',
            operation: 'delete'
          }
        }

        try {
          // Delete from Google Calendar
          await calendar.events.delete({
            calendarId,
            eventId: eventSync.externalId,
          })

          console.log(`✅ [GoogleSync] Deleted event from Google Calendar: ${eventSync.externalId}`)

          // Clean up EventSync record after successful deletion
          // Note: This may not be necessary if Event deletion cascades, but explicit is safer
          if (prisma) {
            try {
              await prisma.eventSync.delete({
                where: {
                  eventId_integrationId: {
                    eventId: event.id,
                    integrationId: integration.id
                  }
                }
              })
            } catch (syncDeleteError) {
              // EventSync may have already been deleted by cascade
              console.log(`📅 [GoogleSync] EventSync record already deleted (cascade): ${event.id}`)
            }
          }

          return {
            success: true,
            provider: 'GOOGLE',
            operation: 'delete'
          }
        } catch (apiError: any) {
          // Handle specific error: event already deleted in Google Calendar
          if (apiError?.code === 410 || apiError?.code === 404 ||
              apiError?.response?.status === 410 || apiError?.response?.status === 404) {
            console.warn(`📅 [GoogleSync] Event ${eventSync.externalId} already deleted from Google Calendar (or not found)`)

            // Clean up orphaned EventSync record
            if (prisma) {
              try {
                await prisma.eventSync.delete({
                  where: {
                    eventId_integrationId: {
                      eventId: event.id,
                      integrationId: integration.id
                    }
                  }
                })
              } catch (syncDeleteError) {
                // Already deleted, ignore
              }
            }

            return {
              success: true,
              provider: 'GOOGLE',
              operation: 'delete (already deleted externally)'
            }
          }

          // For other errors, log and throw
          console.error(`📅 [GoogleSync] Failed to delete event from Google Calendar:`, apiError)
          return {
            success: false,
            provider: 'GOOGLE',
            error: apiError.message || 'Failed to delete from Google Calendar',
            operation: 'delete'
          }
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
    const prisma = getPrismaClient()

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
      if (response.data.nextSyncToken && prisma) {
        await prisma.calendarIntegration.update({
          where: { id: integration.id },
          data: {
            syncToken: response.data.nextSyncToken,
            lastSyncAt: new Date()
          }
        })
      }

      // Process and persist each Google event to database
      for (const googleEvent of response.data.items || []) {
        if (!googleEvent.id) continue // Skip events without ID

        try {
          // Check if EventSync record exists for this Google event
          const existingSync = prisma ? await prisma.eventSync.findFirst({
            where: {
              externalId: googleEvent.id,
              integrationId: integration.id
            },
            include: { event: true }
          }) : null

          let localEvent: UnifiedEvent

          if (existingSync && prisma) {
            // Update existing event in database
            const updatedEvent = await prisma.event.update({
              where: { id: existingSync.eventId },
              data: {
                title: googleEvent.summary || 'Untitled Event',
                description: googleEvent.description || '',
                startDateTime: googleEvent.start?.dateTime || googleEvent.start?.date || '',
                endDateTime: googleEvent.end?.dateTime || googleEvent.end?.date || googleEvent.start?.dateTime || googleEvent.start?.date || '',
                location: googleEvent.location || '',
                isAllDay: !googleEvent.start?.dateTime,
                status: googleEvent.status === 'cancelled' ? 'cancelled' : 'scheduled',
                participants: googleEvent.attendees?.map((a: any) => a.email).filter(Boolean) || [],
                updatedAt: new Date()
              }
            })

            // Update EventSync record
            await prisma.eventSync.update({
              where: { id: existingSync.id },
              data: {
                lastSyncAt: new Date(),
                syncStatus: 'SYNCED',
                remoteVersion: googleEvent.updated ? new Date(googleEvent.updated) : new Date()
              }
            })

            // Convert database event to UnifiedEvent format
            localEvent = this.convertDbEventToUnified(updatedEvent)
            console.log('📅 [GoogleSync] Updated existing event:', updatedEvent.id)
          } else if (prisma) {
            // Create new event in database
            const startDateTime = googleEvent.start?.dateTime || googleEvent.start?.date || ''
            const endDateTime = googleEvent.end?.dateTime || googleEvent.end?.date || startDateTime
            const duration = this.calculateDuration(startDateTime, endDateTime)

            const newEvent = await prisma.event.create({
              data: {
                type: 'EVENT',
                title: googleEvent.summary || 'Untitled Event',
                description: googleEvent.description || '',
                startDateTime,
                endDateTime,
                duration,
                priority: 'MEDIUM',
                location: googleEvent.location || '',
                isAllDay: !googleEvent.start?.dateTime,
                isMultiDay: false,
                isRecurring: false,
                status: googleEvent.status === 'cancelled' ? 'cancelled' : 'scheduled',
                participants: googleEvent.attendees?.map((a: any) => a.email).filter(Boolean) || [],
                googleCalendarEventId: googleEvent.id
              }
            })

            // Create EventSync record to track this sync
            await prisma.eventSync.create({
              data: {
                eventId: newEvent.id,
                integrationId: integration.id,
                provider: 'GOOGLE',
                externalId: googleEvent.id,
                syncStatus: 'SYNCED',
                lastSyncAt: new Date(),
                localVersion: new Date(),
                remoteVersion: googleEvent.updated ? new Date(googleEvent.updated) : new Date()
              }
            })

            // Convert database event to UnifiedEvent format
            localEvent = this.convertDbEventToUnified(newEvent)
            console.log('📅 [GoogleSync] Created new event:', newEvent.id)
          } else {
            // Fallback: No database, just convert to UnifiedEvent
            localEvent = this.convertFromGoogleEvent(googleEvent)
          }

          events.push(localEvent)

          // Check for conflicts with existing local events
          const conflict = await this.detectConflict(localEvent, integration.id, googleEvent.updated || undefined)
          if (conflict) {
            conflicts.push(conflict)
          }
        } catch (eventError) {
          console.error('📅 [GoogleSync] Error processing event:', googleEvent.id, eventError)
          // Continue processing other events even if one fails
        }
      }
    } catch (error: any) {
      console.error('📅 [GoogleSync] Pull error:', error)
      // Handle invalid syncToken by clearing it and retrying
      if (error.code === 410 && integration.syncToken) {
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
   * Convert database Event to UnifiedEvent format
   */
  private static convertDbEventToUnified(dbEvent: any): UnifiedEvent {
    return {
      id: dbEvent.id,
      type: dbEvent.type?.toLowerCase() || 'event',
      title: dbEvent.title,
      description: dbEvent.description || '',
      startDateTime: dbEvent.startDateTime,
      endDateTime: dbEvent.endDateTime || dbEvent.startDateTime,
      duration: dbEvent.duration || 0,
      priority: dbEvent.priority?.toLowerCase() || 'medium',
      location: dbEvent.location || '',
      isAllDay: dbEvent.isAllDay || false,
      isMultiDay: dbEvent.isMultiDay || false,
      isRecurring: dbEvent.isRecurring || false,
      status: dbEvent.status || 'scheduled',
      participants: Array.isArray(dbEvent.participants) ? dbEvent.participants : [],
      clientId: dbEvent.clientId || undefined,
      clientName: dbEvent.clientName || undefined,
      notes: dbEvent.notes || undefined,
      createdAt: dbEvent.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: dbEvent.updatedAt?.toISOString() || new Date().toISOString()
    } as UnifiedEvent
  }

  /**
   * Sync to Notion
   */
  private static async syncToNotion(
    event: UnifiedEvent,
    integration: any,
    operation: 'create' | 'update' | 'delete'
  ): Promise<SyncResult> {
    const { Client } = await import('@notionhq/client')
    const {
      notionApiCall,
      detectNotionDatabaseSchema,
      convertEventToNotionProperties
    } = await import('@/lib/notion-helpers')

    try {
      // Decrypt access token
      let accessToken: string
      try {
        accessToken = decrypt(integration.accessToken)
      } catch (decryptError) {
        console.warn('📅 [NotionSync] Token decryption failed - integration may need to be reconnected')
        return {
          success: false,
          provider: 'NOTION',
          error: 'Notion integration tokens are invalid or corrupted. Please reconnect your Notion.'
        }
      }

      const notion = new Client({ auth: accessToken })

      // Get database ID from integration
      const databaseId = integration.externalId
      if (!databaseId) {
        return {
          success: false,
          provider: 'NOTION',
          error: 'No Notion database configured. Please select a database in integration settings.'
        }
      }

      // Detect database schema
      const schema = await detectNotionDatabaseSchema(notion, databaseId)

      if (!schema.titleProperty || !schema.dateProperty) {
        return {
          success: false,
          provider: 'NOTION',
          error: 'Notion database must have Title and Date properties'
        }
      }

      if (operation === 'create') {
        // Create new page in Notion database
        const properties = convertEventToNotionProperties(event, schema)

        const response = await notionApiCall(() =>
          notion.pages.create({
            parent: { database_id: databaseId },
            properties
          })
        )

        return {
          success: true,
          provider: 'NOTION',
          externalId: response.id,
          operation: 'create'
        }
      } else if (operation === 'update') {
        // Get existing Notion page ID from EventSync
        const eventSync = await this.getEventSync(event.id, integration.id)

        if (!eventSync?.externalId) {
          // Fall back to create if no sync record exists
          const properties = convertEventToNotionProperties(event, schema)

          const response = await notionApiCall(() =>
            notion.pages.create({
              parent: { database_id: databaseId },
              properties
            })
          )

          return {
            success: true,
            provider: 'NOTION',
            externalId: response.id,
            operation: 'create (fallback)'
          }
        }

        // Update existing Notion page
        const properties = convertEventToNotionProperties(event, schema)

        // Remove 'notion-' prefix if present
        const pageId = eventSync.externalId.replace(/^notion-/, '')

        const response = await notionApiCall(() =>
          notion.pages.update({
            page_id: pageId,
            properties
          })
        )

        return {
          success: true,
          provider: 'NOTION',
          externalId: response.id,
          operation: 'update'
        }
      } else if (operation === 'delete') {
        const eventSync = await this.getEventSync(event.id, integration.id)
        const prisma = getPrismaClient()

        // Handle case where no EventSync record exists
        if (!eventSync?.externalId) {
          console.warn(`📅 [NotionSync] No EventSync record for event ${event.id}, cannot delete from Notion`)
          return {
            success: false,
            provider: 'NOTION',
            error: 'Event not synced to Notion (no sync record)',
            operation: 'delete'
          }
        }

        try {
          // Remove 'notion-' prefix if present
          const pageId = eventSync.externalId.replace(/^notion-/, '')

          // Archive the page (Notion doesn't support hard delete via API)
          await notionApiCall(() =>
            notion.pages.update({
              page_id: pageId,
              archived: true
            })
          )

          console.log(`✅ [NotionSync] Archived page in Notion: ${pageId}`)

          // Clean up EventSync record after successful deletion
          if (prisma) {
            try {
              await prisma.eventSync.delete({
                where: {
                  eventId_integrationId: {
                    eventId: event.id,
                    integrationId: integration.id
                  }
                }
              })
            } catch (syncDeleteError) {
              console.log(`📅 [NotionSync] EventSync record already deleted (cascade): ${event.id}`)
            }
          }

          return {
            success: true,
            provider: 'NOTION',
            operation: 'delete'
          }
        } catch (apiError: any) {
          // Handle specific error: page already deleted/archived
          if (apiError?.code === 'object_not_found' || apiError?.status === 404) {
            console.warn(`📅 [NotionSync] Page ${eventSync.externalId} already deleted from Notion (or not found)`)

            // Clean up orphaned EventSync record
            if (prisma) {
              try {
                await prisma.eventSync.delete({
                  where: {
                    eventId_integrationId: {
                      eventId: event.id,
                      integrationId: integration.id
                    }
                  }
                })
              } catch (syncDeleteError) {
                // Already deleted, ignore
              }
            }

            return {
              success: true,
              provider: 'NOTION',
              operation: 'delete (already deleted externally)'
            }
          }

          // For other errors, log and throw
          console.error(`📅 [NotionSync] Failed to delete page from Notion:`, apiError)
          return {
            success: false,
            provider: 'NOTION',
            error: apiError.message || 'Failed to delete from Notion',
            operation: 'delete'
          }
        }
      }

      return { success: false, provider: 'NOTION', error: 'Unknown operation' }
    } catch (error: any) {
      console.error('📅 [NotionSync] Error:', error)
      return {
        success: false,
        provider: 'NOTION',
        error: error.message || 'Notion API error'
      }
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
    const events: UnifiedEvent[] = []
    const conflicts: ConflictInfo[] = []
    const prisma = getPrismaClient()

    const { Client } = await import('@notionhq/client')
    const {
      notionApiCall,
      detectNotionDatabaseSchema,
      convertNotionPageToEvent
    } = await import('@/lib/notion-helpers')

    try {
      // Decrypt access token
      let accessToken: string
      try {
        accessToken = decrypt(integration.accessToken)
      } catch (decryptError) {
        console.error('Failed to decrypt Notion token:', decryptError)
        return { events: [], conflicts: [] }
      }

      const notion = new Client({ auth: accessToken })

      // Get database ID from integration
      const databaseId = integration.externalId
      if (!databaseId) {
        console.warn('📅 [NotionSync] No database ID configured for integration')
        return { events: [], conflicts: [] }
      }

      // Detect database schema
      const schema = await detectNotionDatabaseSchema(notion, databaseId)

      if (!schema.titleProperty || !schema.dateProperty) {
        console.warn('📅 [NotionSync] Database missing required properties (Title or Date)')
        return { events: [], conflicts: [] }
      }

      // Build query filters for date range
      const filters: any[] = []

      if (startDate && schema.dateProperty) {
        filters.push({
          property: schema.dateProperty,
          date: {
            on_or_after: startDate.toISOString()
          }
        })
      }

      if (endDate && schema.dateProperty) {
        filters.push({
          property: schema.dateProperty,
          date: {
            on_or_before: endDate.toISOString()
          }
        })
      }

      // Query database for pages
      const queryParams: any = {
        database_id: databaseId,
        page_size: 100
      }

      // Add filters if we have any
      if (filters.length > 0) {
        queryParams.filter = filters.length === 1 ? filters[0] : { and: filters }
      }

      let response: any
      try {
        response = await notionApiCall(() => (notion.databases as any).query(queryParams))
      } catch (filterError) {
        // If filter fails, try without it
        console.warn('📅 [NotionSync] Query with filters failed, retrying without filters')
        response = await notionApiCall(() =>
          (notion.databases as any).query({
            database_id: databaseId,
            page_size: 100
          })
        )
      }

      // Process and persist each Notion page to database
      for (const page of response.results) {
        if (!page.id) continue

        try {
          // Convert Notion page to UnifiedEvent
          const unifiedEvent = convertNotionPageToEvent(page, schema)

          if (prisma) {
            // Check if EventSync record exists for this Notion page
            const existingSync = await prisma.eventSync.findFirst({
              where: {
                externalId: page.id,
                integrationId: integration.id
              },
              include: { event: true }
            })

            let localEvent: UnifiedEvent

            if (existingSync) {
              // Update existing event in database
              const updatedEvent = await prisma.event.update({
                where: { id: existingSync.eventId },
                data: {
                  title: unifiedEvent.title,
                  description: unifiedEvent.description,
                  startDateTime: unifiedEvent.startDateTime,
                  endDateTime: unifiedEvent.endDateTime,
                  duration: unifiedEvent.duration,
                  isAllDay: unifiedEvent.isAllDay,
                  updatedAt: new Date()
                }
              })

              // Update EventSync record
              await prisma.eventSync.update({
                where: { id: existingSync.id },
                data: {
                  lastSyncAt: new Date(),
                  syncStatus: 'SYNCED',
                  remoteVersion: new Date(page.last_edited_time)
                }
              })

              localEvent = this.convertDbEventToUnified(updatedEvent)
              console.log('📅 [NotionSync] Updated existing event:', updatedEvent.id)
            } else {
              // Create new event in database
              const newEvent = await prisma.event.create({
                data: {
                  type: 'EVENT',
                  title: unifiedEvent.title,
                  description: unifiedEvent.description || '',
                  startDateTime: unifiedEvent.startDateTime,
                  endDateTime: unifiedEvent.endDateTime,
                  duration: unifiedEvent.duration,
                  priority: 'MEDIUM',
                  location: '',
                  isAllDay: unifiedEvent.isAllDay,
                  isMultiDay: false,
                  isRecurring: false,
                  status: 'scheduled',
                  participants: []
                }
              })

              // Create EventSync record to track this sync
              await prisma.eventSync.create({
                data: {
                  eventId: newEvent.id,
                  integrationId: integration.id,
                  provider: 'NOTION',
                  externalId: page.id,
                  syncStatus: 'SYNCED',
                  lastSyncAt: new Date(),
                  localVersion: new Date(),
                  remoteVersion: new Date(page.last_edited_time)
                }
              })

              localEvent = this.convertDbEventToUnified(newEvent)
              console.log('📅 [NotionSync] Created new event:', newEvent.id)
            }

            events.push(localEvent)

            // Check for conflicts with existing local events
            const conflict = await this.detectConflict(
              localEvent,
              integration.id,
              page.last_edited_time
            )
            if (conflict) {
              conflicts.push(conflict)
            }
          } else {
            // No database available, just return the event
            events.push(unifiedEvent)
          }
        } catch (eventError) {
          console.error('📅 [NotionSync] Error processing page:', page.id, eventError)
          // Continue processing other pages even if one fails
        }
      }

      // Update last sync time
      if (prisma) {
        await prisma.calendarIntegration.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncError: null
          }
        })
      }
    } catch (error: any) {
      console.error('📅 [NotionSync] Pull error:', error)

      if (prisma) {
        await prisma.calendarIntegration.update({
          where: { id: integration.id },
          data: {
            lastSyncError: error.message || 'Unknown error'
          }
        })
      }
    }

    return { events, conflicts }
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
          scheduledFor: { lte: new Date() }
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledFor: 'asc' }
        ],
        take: 10
      })

      // Filter items where retryCount < maxRetries
      const validItems = queueItems.filter(item => item.retryCount < item.maxRetries)

      for (const item of validItems) {
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
