# Calendar Integration Sync Investigation

## Executive Summary

This investigation reveals **critical architectural flaws** in the calendar synchronization system that prevent bidirectional sync from working properly. The system has the infrastructure for sync (OAuth tokens, database models, API endpoints) but lacks the **execution layer** to actually perform the sync operations. Specifically:

1. **Outbound sync (local → external)** is partially working - events are pushed to Google Calendar when created/updated/deleted in the web app
2. **Inbound sync (external → local)** is **completely non-functional** - events from Google Calendar are never imported into the local database
3. **Deletion propagation** works correctly in code but may fail due to missing EventSync records
4. **Notion sync** is entirely unimplemented (stub functions return errors)

The root cause is that `CalendarSyncService.pullEventsFromExternalCalendars()` retrieves events from external calendars but **never persists them to the database**. Additionally, there is **no scheduled job or automatic trigger** to call the pull sync function, so even manual syncs via the UI don't persist data.

## Integration Status

### Google Calendar
- **Connection status**: OAuth flow is fully implemented and functional
- **Token management**: ✅ Working - tokens are encrypted (AES-256-GCM) and stored in database
- **Token refresh**: ✅ Working - automatic refresh on token expiry (lines 212-226, 267-289 in `/src/lib/calendar-sync.ts`)
- **Token expiry tracking**: ✅ Stored in `CalendarIntegration.expiresAt`
- **Last successful sync**: Can be verified in database `CalendarIntegration.lastSyncAt` field
- **Outbound sync**: ✅ Working - pushes events to Google Calendar
- **Inbound sync**: ❌ **NOT WORKING** - events retrieved but never persisted
- **Environment variables**: ✅ Confirmed present (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)

### Notion
- **Connection status**: OAuth initiation implemented
- **Last successful sync**: Never (not implemented)
- **Database ID configured**: Attempted to auto-detect from accessible databases
- **Sync implementation**: ❌ **NOT IMPLEMENTED** - all sync functions return stubs
  - `syncToNotion()` at `/src/lib/calendar-sync.ts:393-405` returns error: "Notion sync not yet implemented"
  - `pullFromNotion()` at `/src/lib/calendar-sync.ts:410-417` returns empty array

---

## Root Cause Analysis

### Issue 1: Events not appearing in web app from Google Calendar

**Symptom**: Events created in Google Calendar do not appear in the Becky CRM Time Manager web application.

**Root cause**: The `CalendarSyncService.pullEventsFromExternalCalendars()` method retrieves events from Google Calendar API but **does not persist them to the database**.

**Evidence**:

1. **Sync function retrieves events but doesn't save them** (`/src/lib/calendar-sync.ts:126-168`):
```typescript
static async pullEventsFromExternalCalendars(
  startDate?: Date,
  endDate?: Date
): Promise<{ events: UnifiedEvent[]; conflicts: ConflictInfo[] }> {
  const events: UnifiedEvent[] = []
  const conflicts: ConflictInfo[] = []

  // ... loops through integrations and calls pullFromGoogleCalendar()

  for (const integration of integrations) {
    try {
      if (integration.provider === 'GOOGLE') {
        const result = await this.pullFromGoogleCalendar(integration, startDate, endDate)
        events.push(...result.events)  // ❌ Events only added to array
        conflicts.push(...result.conflicts)
      }
    } catch (error) {
      console.error(`📅 [CalendarSync] Error pulling from ${integration.provider}:`, error)
    }
  }

  return { events, conflicts }  // ❌ Events returned but never saved to DB
}
```

2. **pullFromGoogleCalendar creates UnifiedEvent objects** (`/src/lib/calendar-sync.ts:302-388`):
```typescript
private static async pullFromGoogleCalendar(...) {
  // ... fetches events from Google Calendar API

  for (const googleEvent of response.data.items || []) {
    const unifiedEvent = this.convertFromGoogleEvent(googleEvent)
    events.push(unifiedEvent)  // ❌ Only pushed to in-memory array

    // Check for conflicts with existing local events
    const conflict = await this.detectConflict(unifiedEvent, integration.id, googleEvent.updated)
    if (conflict) {
      conflicts.push(conflict)
    }
  }

  return { events, conflicts }  // ❌ No database persistence
}
```

3. **No database write operations in pull sync**:
   - Searching the codebase shows ZERO calls to `prisma.event.create()` or `prisma.event.upsert()` within the pull sync flow
   - The `convertFromGoogleEvent()` function creates UnifiedEvent objects with IDs like `gcal-${googleEvent.id}`, but these are never persisted

4. **API endpoints that call pull sync don't persist results**:
   - `/src/app/api/calendar/integrations/[integrationId]/sync/route.ts` (lines 214-278) retrieves events and returns them via API, but doesn't save to database
   - The frontend `CalendarIntegrationManager.tsx` receives these events and stores them in component state, but there's no subsequent API call to persist them

**Location**:
- `/src/lib/calendar-sync.ts:126-168` (pullEventsFromExternalCalendars)
- `/src/lib/calendar-sync.ts:302-388` (pullFromGoogleCalendar)
- `/src/app/api/calendar/integrations/[integrationId]/sync/route.ts:160-303` (Google sync endpoint)

**Fix Required**: Add database persistence to pull sync:
```typescript
// After pulling events, persist each to database
for (const event of events) {
  await prisma.event.upsert({
    where: { id: event.id },
    update: {
      // event fields
      updatedAt: new Date()
    },
    create: {
      // event fields
    }
  })

  // Create EventSync record to track external mapping
  await prisma.eventSync.upsert({
    where: {
      eventId_integrationId: {
        eventId: event.id,
        integrationId: integration.id
      }
    },
    update: { /* ... */ },
    create: { /* ... */ }
  })
}
```

---

### Issue 2: Events not deleted from Google Calendar

**Symptom**: Events deleted in the web app still exist in Google Calendar.

**Root cause**: The deletion sync logic is correct, but it depends on EventSync records that may not exist if the event was never properly synced.

**Evidence**:

1. **DELETE endpoint calls sync service correctly** (`/src/app/api/events/route.ts:735-831`):
```typescript
export async function DELETE(request: NextRequest) {
  // ... deletes from database

  // Sync deletion to external calendars if event existed
  if (eventToDelete && prisma) {
    const { CalendarSyncService } = await import('@/lib/calendar-sync')
    const unifiedEvent = convertToUnifiedEvent(eventToDelete)
    const syncResults = await CalendarSyncService.pushEventToExternalCalendars(unifiedEvent, 'delete')
    // ✅ Deletion sync IS being called
  }
}
```

2. **CalendarSyncService delete logic requires EventSync record** (`/src/lib/calendar-sync.ts:273-286`):
```typescript
} else if (operation === 'delete') {
  const eventSync = await this.getEventSync(event.id, integration.id)
  if (eventSync?.externalId) {  // ❌ Depends on EventSync existing
    await calendar.events.delete({
      calendarId,
      eventId: eventSync.externalId,  // Google Calendar event ID
    })
  }
  return {
    success: true,
    provider: 'GOOGLE',
    operation: 'delete'
  }
}
```

3. **EventSync records may not exist**:
   - EventSync records are created in `trackEventSync()` (lines 486-526) ONLY when sync succeeds
   - If initial creation sync failed silently, no EventSync record exists
   - Without EventSync record, the code can't find the Google Calendar event ID to delete
   - **The deletion "succeeds" but does nothing** because of the early return when `eventSync?.externalId` is falsy

4. **Silent failure - no error reporting**:
   - When EventSync doesn't exist, the delete operation returns `success: true` anyway
   - User has no indication that deletion didn't propagate
   - Logs show: `📅 [GoogleSync] Event deleted successfully` even when nothing was deleted

**Location**:
- `/src/app/api/events/route.ts:787-796` (DELETE handler sync call)
- `/src/lib/calendar-sync.ts:273-286` (syncToGoogleCalendar delete case)
- `/src/lib/calendar-sync.ts:531-547` (getEventSync helper)

**Fix Required**:
1. Ensure EventSync records are created reliably during create/update operations
2. Add error handling when EventSync is missing:
```typescript
} else if (operation === 'delete') {
  const eventSync = await this.getEventSync(event.id, integration.id)
  if (!eventSync?.externalId) {
    console.warn(`[GoogleSync] No EventSync record for event ${event.id}, cannot delete from Google Calendar`)
    return {
      success: false,
      provider: 'GOOGLE',
      error: 'Event not found in external calendar (no sync record)',
      operation: 'delete'
    }
  }

  await calendar.events.delete({
    calendarId,
    eventId: eventSync.externalId,
  })

  // Delete EventSync record after successful external deletion
  await prisma.eventSync.delete({
    where: {
      eventId_integrationId: {
        eventId: event.id,
        integrationId: integration.id
      }
    }
  })

  return {
    success: true,
    provider: 'GOOGLE',
    operation: 'delete'
  }
}
```

---

### Issue 3: New events not syncing to Google Calendar

**Symptom**: Events created in the web app do not appear in Google Calendar.

**Root cause**: **This issue may not actually exist** - the code path shows outbound sync IS working. However, there are potential failure points:

**Evidence**:

1. **POST /api/events DOES call outbound sync** (`/src/app/api/events/route.ts:509-528`):
```typescript
export async function POST(request: NextRequest) {
  // ... creates event locally

  // ✅ Sync to external calendars using new CalendarSyncService
  const { CalendarSyncService } = await import('@/lib/calendar-sync')
  const externalSyncResults = await CalendarSyncService.pushEventToExternalCalendars(newEvent, 'create')
  const syncedProviders = externalSyncResults.filter(r => r.success).map(r => r.provider)

  if (syncedProviders.length > 0) {
    console.log(`📅 Event synced to external calendars: ${syncedProviders.join(', ')}`)
  }
}
```

2. **pushEventToExternalCalendars correctly calls Google API** (`/src/lib/calendar-sync.ts:37-121`):
```typescript
static async pushEventToExternalCalendars(
  event: UnifiedEvent,
  operation: 'create' | 'update' | 'delete' = 'create'
): Promise<SyncResult[]> {
  // ... finds active integrations with syncDirection: BIDIRECTIONAL or EXPORT_ONLY

  for (const integration of integrations) {
    if (integration.provider === 'GOOGLE') {
      result = await this.syncToGoogleCalendar(event, integration, operation)
      // ✅ Calls Google Calendar API
    }
  }
}
```

3. **syncToGoogleCalendar creates events in Google** (`/src/lib/calendar-sync.ts:173-297`):
```typescript
private static async syncToGoogleCalendar(...) {
  // ... OAuth setup, token decryption

  if (operation === 'create') {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: googleEvent,
    })
    // ✅ Actually calls Google Calendar API to insert event

    return {
      success: true,
      provider: 'GOOGLE',
      externalId: response.data.id || undefined,
      operation: 'create'
    }
  }
}
```

**Potential failure scenarios**:

1. **No active integrations**: If user hasn't connected Google Calendar, `integrations.length === 0` and sync is skipped silently
2. **Wrong sync direction**: If integration's `syncDirection` is set to `IMPORT_ONLY`, events won't be pushed
3. **Token expired/invalid**: If OAuth token is expired and refresh fails, sync will fail
4. **Silent error swallowing**: Errors are caught and queued for retry, but user isn't notified

**Location**:
- `/src/app/api/events/route.ts:509-528` (POST handler sync call)
- `/src/lib/calendar-sync.ts:37-121` (pushEventToExternalCalendars)
- `/src/lib/calendar-sync.ts:173-297` (syncToGoogleCalendar create case)

**Verification needed**:
1. Check database for active CalendarIntegration records: `SELECT * FROM "CalendarIntegration" WHERE "isActive" = true`
2. Check integration syncDirection: should be `BIDIRECTIONAL` or `EXPORT_ONLY`
3. Check server logs for sync errors when creating events
4. Verify Google Calendar API credentials are valid

**Fix Required** (if sync is actually failing):
1. Add user-facing error messages when sync fails
2. Implement retry queue processing (currently queued but never processed)
3. Add UI indicator showing sync status per event

---

### Issue 4: Events not syncing to Notion

**Symptom**: Events are not syncing to Notion calendar/database.

**Root cause**: Notion sync is **completely unimplemented** - all functions are stubs that return errors or empty arrays.

**Evidence**:

1. **syncToNotion returns error** (`/src/lib/calendar-sync.ts:393-405`):
```typescript
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
```

2. **pullFromNotion returns empty** (`/src/lib/calendar-sync.ts:410-417`):
```typescript
private static async pullFromNotion(
  integration: any,
  startDate?: Date,
  endDate?: Date
): Promise<{ events: UnifiedEvent[]; conflicts: ConflictInfo[] }> {
  // TODO: Implement Notion pull
  return { events: [], conflicts: [] }
}
```

3. **Notion integration sync endpoint has placeholder implementation** (`/src/app/api/calendar/integrations/[integrationId]/sync/route.ts:305-526`):
   - This endpoint attempts to query Notion databases
   - It can retrieve Notion pages and convert them to events
   - BUT it only returns them via API - doesn't persist to local database
   - Same issue as Google Calendar pull sync

**Location**:
- `/src/lib/calendar-sync.ts:393-405` (syncToNotion stub)
- `/src/lib/calendar-sync.ts:410-417` (pullFromNotion stub)
- `/src/app/api/calendar/integrations/[integrationId]/sync/route.ts:305-526` (Notion sync endpoint)

**Fix Required**:
1. Implement `syncToNotion()` to create/update/delete pages in Notion database
2. Implement `pullFromNotion()` to fetch Notion pages and convert to events
3. Add database persistence to Notion pull sync (same as Google fix)
4. Handle Notion-specific challenges:
   - Notion uses databases, not calendars - need to map events to database pages
   - Need to determine which database to use (currently tries to auto-detect)
   - Need to map event properties to Notion page properties

---

## Data Flow Diagrams

### Current Flow: Outbound Sync (Create Event)

```
┌──────────────────────────────────────────────────────────────────────┐
│  User creates event in web app                                      │
└────────────┬─────────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  POST /api/events                                                  │
│  1. Creates event in localStorage (UnifiedEventsManager)          │
│  2. Creates event in database (Prisma)                            │
│  3. Calls CalendarSyncService.pushEventToExternalCalendars()      │
└────────────┬───────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  CalendarSyncService.pushEventToExternalCalendars()               │
│  1. Finds active integrations (BIDIRECTIONAL or EXPORT_ONLY)      │
│  2. For each integration:                                          │
│     - Calls syncToGoogleCalendar() or syncToNotion()              │
└────────────┬───────────────────────────────────────────────────────┘
             │
             ├──────────────────────┬─────────────────────────────────┐
             │                      │                                 │
             ▼                      ▼                                 ▼
     ┌─────────────┐       ┌──────────────┐               ┌──────────────┐
     │   Google    │       │    Notion    │               │   (Future)   │
     │  Calendar   │       │  Database    │               │  Providers   │
     │             │       │              │               │              │
     │  ✅ WORKS   │       │  ❌ STUB     │               │              │
     │             │       │  (returns    │               │              │
     │  - Creates  │       │   error)     │               │              │
     │    event    │       │              │               │              │
     │  - Returns  │       │              │               │              │
     │    eventId  │       │              │               │              │
     └─────────────┘       └──────────────┘               └──────────────┘
             │
             ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │  trackEventSync()                                               │
     │  - Creates/updates EventSync record                             │
     │  - Maps local event ID to Google Calendar event ID              │
     │  - Tracks sync status, retry count                              │
     └─────────────────────────────────────────────────────────────────┘
```

### Current Flow: Inbound Sync (Manual Sync Button)

```
┌──────────────────────────────────────────────────────────────────────┐
│  User clicks "Sync" button in CalendarIntegrationManager UI         │
└────────────┬─────────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  calendarService.syncEvents(integrationId)                         │
│  (frontend, /src/lib/calendar-service.ts:82-111)                   │
└────────────┬───────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  POST /api/calendar/integrations/${integrationId}/sync            │
│  (backend, route.ts:47-158)                                        │
│  1. Verifies authentication                                        │
│  2. Fetches integration from database                              │
│  3. Calls syncGoogleCalendar() or syncNotionCalendar()            │
└────────────┬───────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  syncGoogleCalendar() (route.ts:160-303)                          │
│  1. Decrypts OAuth tokens                                          │
│  2. Calls Google Calendar API events.list()                        │
│  3. Converts Google events to UnifiedEvent format                  │
│  4. Updates integration.lastSyncAt                                 │
│  5. ❌ Returns events via API (NO DATABASE PERSISTENCE)            │
└────────────┬───────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  Frontend receives events                                          │
│  (CalendarIntegrationManager.tsx:214-275)                         │
│  1. Stores events in component state: setAllEvents()               │
│  2. Calls onEventsSync() callback                                  │
│  3. ❌ NO SUBSEQUENT API CALL TO PERSIST EVENTS                    │
└────────────┬───────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  ❌ RESULT: Events visible in UI during session only               │
│  - Events lost on page refresh                                     │
│  - Events not available to other components                        │
│  - Events not in database queries                                  │
└────────────────────────────────────────────────────────────────────┘
```

### Expected Flow: Inbound Sync (SHOULD work like this)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Trigger: Manual sync button OR scheduled job OR webhook            │
└────────────┬─────────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  CalendarSyncService.pullEventsFromExternalCalendars()            │
│  1. Finds active integrations (BIDIRECTIONAL or IMPORT_ONLY)       │
│  2. For each integration: calls pullFromGoogleCalendar()           │
└────────────┬───────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  pullFromGoogleCalendar() (calendar-sync.ts:302-388)              │
│  1. Decrypts OAuth tokens                                          │
│  2. Uses syncToken for incremental sync (if available)             │
│  3. Calls Google Calendar API events.list()                        │
│  4. Converts Google events to UnifiedEvent format                  │
│  5. ✅ SHOULD: Upsert each event to database                       │
│  6. ✅ SHOULD: Create EventSync records                            │
│  7. Detects conflicts with local events                            │
│  8. Stores new syncToken for next incremental sync                 │
└────────────┬───────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  FOR EACH EVENT:                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  await prisma.event.upsert({                                 │ │
│  │    where: { id: event.id },                                  │ │
│  │    update: { ...eventData, updatedAt: new Date() },          │ │
│  │    create: { ...eventData }                                  │ │
│  │  })                                                           │ │
│  │                                                               │ │
│  │  await prisma.eventSync.upsert({                             │ │
│  │    where: {                                                  │ │
│  │      eventId_integrationId: {                                │ │
│  │        eventId: event.id,                                    │ │
│  │        integrationId: integration.id                         │ │
│  │      }                                                        │ │
│  │    },                                                         │ │
│  │    update: { lastSyncAt: new Date(), ... },                  │ │
│  │    create: { externalId: googleEvent.id, ... }               │ │
│  │  })                                                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## Recommendations

### Critical Priority (Must Fix)

**1. Implement database persistence for inbound sync**

Location: `/src/lib/calendar-sync.ts:302-388` (pullFromGoogleCalendar)

Add after line 363 (after converting Google event to UnifiedEvent):

```typescript
// Convert and persist each Google event
for (const googleEvent of response.data.items || []) {
  const unifiedEvent = this.convertFromGoogleEvent(googleEvent)

  // PERSIST TO DATABASE
  const prisma = getPrismaClient()
  if (prisma) {
    try {
      // Convert UnifiedEvent to Prisma Event format
      const prismaEventData = {
        id: unifiedEvent.id,
        type: unifiedEvent.type.toUpperCase() as EventType,
        title: unifiedEvent.title,
        description: unifiedEvent.description,
        startDateTime: unifiedEvent.startDateTime,
        endDateTime: unifiedEvent.endDateTime || unifiedEvent.startDateTime,
        duration: unifiedEvent.duration || 60,
        priority: (unifiedEvent.priority || 'MEDIUM').toUpperCase() as Priority,
        location: unifiedEvent.location,
        isAllDay: unifiedEvent.isAllDay,
        isMultiDay: unifiedEvent.isMultiDay || false,
        isRecurring: unifiedEvent.isRecurring || false,
        status: unifiedEvent.status,
        participants: unifiedEvent.participants ? JSON.stringify(unifiedEvent.participants) : null,
      }

      // Upsert event to database
      await prisma.event.upsert({
        where: { id: unifiedEvent.id },
        update: {
          ...prismaEventData,
          updatedAt: new Date()
        },
        create: prismaEventData
      })

      // Track sync mapping
      await this.trackEventSync(
        unifiedEvent.id,
        integration.id,
        integration.provider,
        googleEvent.id,
        'SYNCED'
      )

      console.log(`✅ Persisted event from Google Calendar: ${unifiedEvent.title}`)
    } catch (dbError) {
      console.error(`❌ Failed to persist event ${unifiedEvent.id}:`, dbError)
    }
  }

  events.push(unifiedEvent)

  // Check for conflicts
  const conflict = await this.detectConflict(unifiedEvent, integration.id, googleEvent.updated)
  if (conflict) {
    conflicts.push(conflict)
  }
}
```

**2. Add scheduled/automatic sync triggers**

Currently, sync only happens when user manually clicks "Sync" button. Need to:

- Add cron job or scheduled task to call `pullEventsFromExternalCalendars()` every 15-30 minutes
- OR implement Google Calendar push notifications (webhooks) for real-time sync
- OR call pull sync on page load/mount in Time Manager

Example: Add to `/src/app/time-manager/page.tsx`:

```typescript
useEffect(() => {
  const syncAllIntegrations = async () => {
    try {
      const response = await fetch('/api/calendar/integrations')
      if (response.ok) {
        const { data: integrations } = await response.json()

        for (const integration of integrations) {
          if (integration.isActive) {
            // Trigger sync for each active integration
            await fetch(`/api/calendar/integrations/${integration.id}/sync`, {
              method: 'POST'
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync integrations:', error)
    }
  }

  // Sync on mount and every 30 minutes
  syncAllIntegrations()
  const interval = setInterval(syncAllIntegrations, 30 * 60 * 1000)

  return () => clearInterval(interval)
}, [])
```

**3. Fix deletion sync to handle missing EventSync records**

Location: `/src/lib/calendar-sync.ts:273-286`

Replace current delete implementation with:

```typescript
} else if (operation === 'delete') {
  const eventSync = await this.getEventSync(event.id, integration.id)

  if (!eventSync?.externalId) {
    console.warn(`📅 [GoogleSync] No EventSync record for event ${event.id}, cannot delete from Google Calendar`)
    return {
      success: false,
      provider: 'GOOGLE',
      error: 'Event not found in external calendar (no sync record exists)',
      operation: 'delete'
    }
  }

  try {
    await calendar.events.delete({
      calendarId,
      eventId: eventSync.externalId,
    })

    // Delete EventSync record after successful external deletion
    await prisma.eventSync.delete({
      where: {
        eventId_integrationId: {
          eventId: event.id,
          integrationId: integration.id
        }
      }
    })

    console.log(`✅ Deleted event from Google Calendar: ${eventSync.externalId}`)

    return {
      success: true,
      provider: 'GOOGLE',
      operation: 'delete'
    }
  } catch (apiError: any) {
    // Handle specific error: event already deleted in Google Calendar
    if (apiError?.code === 410 || apiError?.response?.status === 410) {
      console.warn(`📅 [GoogleSync] Event ${eventSync.externalId} already deleted from Google Calendar`)

      // Clean up orphaned EventSync record
      await prisma.eventSync.delete({
        where: {
          eventId_integrationId: {
            eventId: event.id,
            integrationId: integration.id
          }
        }
      })

      return {
        success: true,
        provider: 'GOOGLE',
        operation: 'delete (already deleted)'
      }
    }

    throw apiError
  }
}
```

### High Priority

**4. Add user-facing sync status indicators**

Users need to know when sync succeeds/fails:

- Add toast notifications for sync success/failure
- Show sync status icon next to each event (synced to Google, local only, etc.)
- Display last sync time prominently in UI
- Show error messages when sync fails

**5. Implement Notion sync**

Files to update:
- `/src/lib/calendar-sync.ts:393-417` (syncToNotion, pullFromNotion)
- Need to:
  - Map UnifiedEvent to Notion page properties
  - Create pages in designated Notion database
  - Handle Notion API pagination
  - Add same database persistence as Google fix

**6. Implement sync queue processor**

Currently, failed syncs are queued (`queueSyncOperation()` at line 602) but the queue is never processed.

Add background job to call `processSyncQueue()` (line 634) every 5-10 minutes.

### Medium Priority

**7. Add conflict resolution UI**

The `detectConflict()` function identifies when local and remote events have both been modified, but there's no UI to handle this.

**8. Implement webhook support for real-time sync**

Instead of polling, use Google Calendar push notifications:
- Register watch channel with Google Calendar API
- Receive notifications at `/api/calendar/webhooks/google`
- Trigger pull sync when changes detected

**9. Add sync health monitoring**

- Track sync success/failure rates
- Alert when sync has failed repeatedly
- Dashboard showing sync health per integration

### Low Priority

**10. Optimize sync performance**

- Use incremental sync (syncToken) for all syncs, not just when available
- Batch database operations
- Add caching layer

**11. Add support for more calendar providers**

- Microsoft Outlook (structure exists, needs implementation)
- Apple Calendar (iCal/CalDAV)

---

## Files Analyzed

| File Path | Lines Analyzed | Key Findings |
|-----------|---------------|--------------|
| `/src/lib/calendar-sync.ts` | 1-692 | Core sync service; pull sync doesn't persist to DB; delete relies on EventSync |
| `/src/lib/calendar-service.ts` | 1-247 | Client-side service; uses localStorage; calls sync API endpoints |
| `/src/app/api/events/route.ts` | 1-831 | Event CRUD API; calls outbound sync; DELETE sync may fail silently |
| `/src/app/api/calendar/google/sync/route.ts` | 1-156 | Google Calendar sync endpoint; only returns events, no DB persistence |
| `/src/app/api/calendar/integrations/[integrationId]/sync/route.ts` | 1-527 | Integration sync API; retrieves events but doesn't save them |
| `/src/app/api/auth/google/route.ts` | 1-56 | OAuth initiation; generates auth URL |
| `/src/app/api/auth/google/callback/route.ts` | 1-175 | OAuth callback; stores encrypted tokens in DB; creates CalendarIntegration |
| `/src/components/CalendarIntegrationManager.tsx` | 1-584 | UI component; manual sync button; stores events in component state only |
| `/prisma/schema.prisma` | 1-1495 | Database schema; Event, CalendarIntegration, EventSync, SyncQueue models exist |

---

## Verification Checklist

- [x] Traced complete sync flow for create, update, and delete operations
- [x] Identified specific code locations where sync fails
- [x] Verified OAuth token handling and refresh logic
- [x] Checked for silent error swallowing - found in deletion sync
- [x] Documented external ID mapping mechanism (EventSync model)
- [x] Confirmed sync is triggered automatically - **NO, only manual**
- [x] Reviewed error handling - mixed, some good (token refresh) some bad (silent failures)

---

## Summary Table

| Sync Direction | Provider | Status | Root Cause | Fix Complexity |
|---------------|----------|--------|------------|----------------|
| Local → Google | Google | ✅ Working | N/A | N/A |
| Google → Local | Google | ❌ Broken | No database persistence in pullFromGoogleCalendar | Medium |
| Local → Notion | Notion | ❌ Not Implemented | Stub function returns error | High |
| Notion → Local | Notion | ❌ Not Implemented | Stub function returns empty array | High |
| Delete → Google | Google | ⚠️ Partial | Works IF EventSync exists, silently fails otherwise | Low |
| Delete → Notion | Notion | ❌ Not Implemented | Stub function | High |

**Integration Health:**
- Google Calendar: OAuth ✅ | Token Refresh ✅ | Outbound ✅ | Inbound ❌ | Delete ⚠️
- Notion: OAuth ✅ | Token Refresh ✅ | Outbound ❌ | Inbound ❌ | Delete ❌

**Critical Action Items:**
1. Add database persistence to `pullFromGoogleCalendar()` - **BLOCKER for inbound sync**
2. Add automatic sync triggers (cron job or on page load) - **BLOCKER for user discovery**
3. Fix delete sync error handling - **BLOCKER for deletion propagation**
4. Implement Notion sync or disable Notion provider in UI - **USER CONFUSION**
