# Event Sync Discrepancy Analysis Report

**Date:** 2025-12-24
**Issue:** Events from Google Calendar and Notion Calendar are not appearing in Becky CRM

---

## Executive Summary

Events are successfully pulled from external calendars (Google Calendar, Notion) but **are not being saved to the database**. The sync system retrieves events and converts them correctly, but the critical step of persisting these events to the Becky CRM database is missing.

### Root Cause
The `CalendarSyncService.pullEventsFromExternalCalendars()` method in `/src/lib/calendar-sync.ts` (lines 126-168) only returns events in memory without persisting them to the database.

---

## Sync Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL CALENDARS                                │
│  ┌──────────────┐           ┌──────────────┐                        │
│  │   Google     │           │    Notion    │                        │
│  │   Calendar   │           │   Calendar   │                        │
│  └──────┬───────┘           └──────┬───────┘                        │
└─────────┼──────────────────────────┼──────────────────────────────┘
          │                          │
          │ API Call                 │ API Call
          │ (OAuth)                  │ (API Token)
          ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   SYNC ENDPOINTS                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  /api/calendar/google/sync (route.ts:86-93)                    │ │
│  │  - Pulls events from Google Calendar API                       │ │
│  │  - Returns events as JSON (NOT saved to DB)                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  /api/calendar/sync/notion/pull (route.ts:76-94)               │ │
│  │  - Pulls events from Notion database                           │ │
│  │  - DOES save to database (✓)                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│           CALENDAR SYNC SERVICE (lib/calendar-sync.ts)              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  pullEventsFromExternalCalendars() (lines 126-168)             │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  1. Fetch active integrations                            │  │ │
│  │  │  2. For each integration:                                │  │ │
│  │  │     - Call pullFromGoogleCalendar() (lines 302-388)      │  │ │
│  │  │     - Call pullFromNotion() (lines 410-417)              │  │ │
│  │  │  3. Convert external events → UnifiedEvent format        │  │ │
│  │  │  4. Return events array ❌ NO DATABASE SAVE              │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Events returned but NOT persisted
                            ▼
                     ┌──────────────┐
                     │   NOWHERE    │  ❌ Events lost!
                     └──────────────┘
```

---

## Detailed Findings

### 1. Google Calendar Sync

#### Endpoint: `/src/app/api/calendar/google/sync/route.ts`

**Lines 86-113:**
```typescript
const response = await calendar.events.list({
  calendarId: finalCalendarId,
  timeMin: timeMin.toISOString(),
  timeMax: timeMax.toISOString(),
  maxResults: 100,
  singleEvents: true,
  orderBy: 'startTime'
})

const events = response.data.items?.map(event => ({
  id: event.id,
  title: event.summary || 'Untitled Event',
  // ... conversion logic ...
})) || []

return NextResponse.json({
  success: true,
  events,  // ❌ Only returned, never saved
  syncedAt: new Date().toISOString()
})
```

**Issue:** Events are fetched and returned but **never persisted to database**.

#### CalendarSyncService: `/src/lib/calendar-sync.ts`

**Lines 302-388 (`pullFromGoogleCalendar`):**
```typescript
// Convert Google events to UnifiedEvents and detect conflicts
for (const googleEvent of response.data.items || []) {
  const unifiedEvent = this.convertFromGoogleEvent(googleEvent)
  events.push(unifiedEvent)  // ❌ Only added to in-memory array

  // Check for conflicts with existing local events
  const conflict = await this.detectConflict(unifiedEvent, integration.id, googleEvent.updated)
  if (conflict) {
    conflicts.push(conflict)
  }
}

return { events, conflicts }  // ❌ Returns events but doesn't save them
```

**Issue:** Events are converted correctly and conflicts are detected, but **no `prisma.event.create()` call exists**.

---

### 2. Notion Calendar Sync

#### Notion Pull Endpoint: `/src/app/api/calendar/sync/notion/pull/route.ts`

**Lines 100-210:**
```typescript
for (const page of response.results) {
  try {
    const unifiedEvent = convertNotionPageToEvent(page as any)
    events.push(unifiedEvent)

    // Check if event exists locally
    const localEvent = await prisma.event.findFirst({ /* ... */ })

    if (localEvent) {
      // ✓ Update existing event
      await prisma.event.update({ /* ... */ })

      // ✓ Update sync record
      await prisma.eventSync.upsert({ /* ... */ })
    } else {
      // ✓ Create new local event
      const newEvent = await prisma.event.create({ /* ... */ })

      // ✓ Create sync record
      await prisma.eventSync.create({ /* ... */ })
    }
  } catch (error) {
    console.error('Error processing page:', page.id, error)
  }
}
```

**Status:** ✓ Notion sync **correctly saves events to database** with proper sync tracking.

**However:** The Notion sync implementation in `CalendarSyncService.pullFromNotion()` (lines 410-417) is a stub:
```typescript
private static async pullFromNotion(
  integration: any,
  startDate?: Date,
  endDate?: Date
): Promise<{ events: UnifiedEvent[]; conflicts: ConflictInfo[] }> {
  // TODO: Implement Notion pull
  return { events: [], conflicts: [] }  // ❌ Returns empty array
}
```

---

### 3. Frontend Event Display

#### Hook: `/src/hooks/useUnifiedEvents.ts`

**Lines 52-111 (`loadEvents`):**
```typescript
const loadEvents = useCallback(async () => {
  setIsLoading(true)
  setError(null)

  try {
    // Try to load from API first (includes both localStorage and database)
    const response = await fetch('/api/events?source=both', {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        setEvents(result.events)  // ✓ Displays events from DB
        return
      }
    }
  } catch (apiError) {
    // Fallback to localStorage
  }
}, [syncWithLegacy])
```

**Status:** ✓ Frontend correctly fetches and displays events from database.

#### Events API: `/src/app/api/events/route.ts`

**Lines 544-588 (GET):**
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source') || 'both'

  let events: UnifiedEvent[] = []

  // Get events from localStorage
  if (source === 'localStorage' || source === 'both') {
    events = UnifiedEventsManager.getAllEvents()
  }

  // Get events from database
  if (source === 'database' || source === 'both') {
    const prisma = getPrismaClient()
    if (prisma) {
      const dbEvents = await prisma.event.findMany({
        orderBy: { startDateTime: 'asc' }
      })
      const convertedDbEvents = dbEvents.map(convertFromPrismaEvent)

      // Merge with localStorage, avoiding duplicates
      events = [...events, ...uniqueDbEvents]
    }
  }

  return NextResponse.json({
    success: true,
    events,  // ✓ Returns all events from DB + localStorage
    source: source,
    count: events.length
  })
}
```

**Status:** ✓ API correctly queries database and returns events.

---

## The Missing Link

### Problem: Events Never Reach Database

**Current Flow:**
1. ✓ Google Calendar API → `/api/calendar/google/sync` → Returns events JSON
2. ✓ Events converted to `UnifiedEvent` format
3. ❌ **Events returned to caller but NEVER saved to database**
4. ❌ Frontend calls `/api/events?source=database` → Returns empty because nothing was saved

**What's Missing:**

After `pullFromGoogleCalendar()` retrieves events, there should be a step to:
1. Create/update events in the database
2. Create EventSync records to track external→local mapping
3. Handle conflicts appropriately

---

## Evidence from Code

### Database Schema (Confirmed)

**`/prisma/schema.prisma`:**
- ✓ `Event` table exists (lines 179-250)
- ✓ `EventSync` table exists (lines 747-779) for tracking external calendar sync
- ✓ `CalendarIntegration` table exists (lines 708-745)
- ✓ Proper relationships defined

### CalendarIntegration Records

The system correctly stores calendar integrations:
- ✓ Google Calendar credentials (encrypted)
- ✓ Notion Calendar credentials (encrypted)
- ✓ Sync settings (syncDirection, syncToken, etc.)

### Where Events ARE Saved (Comparison)

**Notion endpoint (`/api/calendar/sync/notion/pull/route.ts`) shows the correct pattern:**

```typescript
// After pulling from Notion
for (const page of response.results) {
  const unifiedEvent = convertNotionPageToEvent(page)

  // ✓ SAVE TO DATABASE
  if (localEvent) {
    await prisma.event.update({ where: { id: localEvent.id }, data: { /* ... */ } })
  } else {
    await prisma.event.create({ data: { /* ... */ } })
  }

  // ✓ TRACK SYNC
  await prisma.eventSync.upsert({
    where: { eventId_integrationId: { eventId, integrationId } },
    create: { /* ... */ },
    update: { /* ... */ }
  })
}
```

---

## Recommended Fix

### Solution 1: Update `pullFromGoogleCalendar` to Save Events

**File:** `/src/lib/calendar-sync.ts`
**Lines:** 360-370 (inside the loop)

Add database persistence:

```typescript
for (const googleEvent of response.data.items || []) {
  const unifiedEvent = this.convertFromGoogleEvent(googleEvent)

  // ✓ Check if event already exists
  const existingSync = await prisma.eventSync.findFirst({
    where: {
      integrationId: integration.id,
      externalId: googleEvent.id
    },
    include: { event: true }
  })

  let dbEvent
  if (existingSync) {
    // Update existing event
    dbEvent = await prisma.event.update({
      where: { id: existingSync.eventId },
      data: {
        title: unifiedEvent.title,
        description: unifiedEvent.description,
        startDateTime: unifiedEvent.startDateTime,
        endDateTime: unifiedEvent.endDateTime,
        duration: unifiedEvent.duration,
        location: unifiedEvent.location,
        isAllDay: unifiedEvent.isAllDay,
        updatedAt: new Date()
      }
    })

    // Update sync tracking
    await prisma.eventSync.update({
      where: { id: existingSync.id },
      data: {
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        remoteVersion: new Date(googleEvent.updated)
      }
    })
  } else {
    // Create new event
    dbEvent = await prisma.event.create({
      data: {
        type: 'EVENT',
        title: unifiedEvent.title,
        description: unifiedEvent.description || '',
        startDateTime: unifiedEvent.startDateTime,
        endDateTime: unifiedEvent.endDateTime || unifiedEvent.startDateTime,
        duration: unifiedEvent.duration,
        priority: 'MEDIUM',
        location: unifiedEvent.location,
        isAllDay: unifiedEvent.isAllDay,
        isMultiDay: unifiedEvent.isMultiDay || false,
        isRecurring: false
      }
    })

    // Create sync tracking record
    await prisma.eventSync.create({
      data: {
        eventId: dbEvent.id,
        integrationId: integration.id,
        provider: 'GOOGLE',
        externalId: googleEvent.id,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        localVersion: new Date(),
        remoteVersion: new Date(googleEvent.updated)
      }
    })
  }

  events.push({ ...unifiedEvent, id: dbEvent.id })

  // Check for conflicts
  const conflict = await this.detectConflict(unifiedEvent, integration.id, googleEvent.updated)
  if (conflict) {
    conflicts.push(conflict)
  }
}
```

### Solution 2: Implement `pullFromNotion` in CalendarSyncService

**File:** `/src/lib/calendar-sync.ts`
**Lines:** 410-417

Replace the stub with actual Notion pull logic (can reference `/src/app/api/calendar/sync/notion/pull/route.ts` for the implementation).

### Solution 3: Create Sync Trigger Endpoint

Create a new API endpoint that triggers sync and ensures events are saved:

**New File:** `/src/app/api/calendar/sync/trigger/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { CalendarSyncService } from '@/lib/calendar-sync'
import { getPrismaClient } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      )
    }

    // Pull events from all external calendars
    const result = await CalendarSyncService.pullEventsFromExternalCalendars()

    // Note: With the fix above, events are now saved during pull

    return NextResponse.json({
      success: true,
      eventsPulled: result.events.length,
      conflicts: result.conflicts.length,
      message: `Synced ${result.events.length} events from external calendars`
    })
  } catch (error) {
    console.error('Sync trigger error:', error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
}
```

---

## Testing Plan

### 1. Verify Database Schema
```bash
npx prisma studio
```
- Check `Event` table for existing records
- Check `EventSync` table for sync tracking records
- Check `CalendarIntegration` table for active integrations

### 2. Test Google Calendar Sync
1. Call `/api/calendar/google/sync` with valid integrationId
2. Check database for new Event records
3. Check EventSync table for tracking records
4. Verify UI displays the events

### 3. Test Notion Calendar Sync
1. Call `/api/calendar/sync/notion/pull` with valid integrationId
2. Verify events are saved (this should already work)
3. Check EventSync records

### 4. Test End-to-End Flow
1. Create event in Google Calendar
2. Trigger sync via `/api/calendar/sync/trigger`
3. Check database for event
4. Open Becky CRM calendar UI
5. Verify event appears

---

## Priority Actions

1. **HIGH PRIORITY:** Implement database persistence in `pullFromGoogleCalendar()` method
2. **MEDIUM PRIORITY:** Implement `pullFromNotion()` in CalendarSyncService (currently stub)
3. **MEDIUM PRIORITY:** Create automated sync trigger (cron job or webhook)
4. **LOW PRIORITY:** Add sync status UI to show last sync time and status

---

## Conclusion

The sync infrastructure is well-designed with proper database schema, encryption, and conflict detection. However, the critical database persistence step is missing from the Google Calendar pull flow. The Notion endpoint demonstrates the correct pattern but needs to be replicated in the CalendarSyncService.

**Key Files to Modify:**
1. `/src/lib/calendar-sync.ts` - Add database persistence to `pullFromGoogleCalendar()`
2. `/src/lib/calendar-sync.ts` - Implement `pullFromNotion()` method
3. `/src/app/api/calendar/sync/trigger/route.ts` - Create sync trigger endpoint (optional)

**Expected Outcome:**
Once fixed, events from Google Calendar and Notion will be:
- ✓ Pulled from external APIs
- ✓ Converted to UnifiedEvent format
- ✓ Saved to Becky CRM database
- ✓ Displayed in the calendar UI
- ✓ Tracked with EventSync records for bidirectional sync
