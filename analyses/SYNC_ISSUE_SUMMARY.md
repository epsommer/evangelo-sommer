# Event Sync Issue - Quick Summary

## The Problem
Events from Google Calendar and Notion Calendar are visible in those external apps but NOT appearing in Becky CRM.

## Root Cause
Events are being **pulled but not saved** to the database.

```
Google/Notion Calendar → API Pull → Convert to UnifiedEvent → ❌ STOP (not saved)
                                                              ↓
                                                         (events lost)
```

## Where It Breaks

### Working: Notion Direct Endpoint ✓
`/api/calendar/sync/notion/pull/route.ts` correctly:
- Pulls from Notion
- Saves to database
- Creates sync tracking records

### Broken: CalendarSyncService ❌
`/src/lib/calendar-sync.ts` method `pullFromGoogleCalendar()`:
- ✓ Pulls from Google Calendar API
- ✓ Converts events to UnifiedEvent format
- ✓ Detects conflicts
- ❌ **Returns events but NEVER saves to database**

### Also Broken: Notion via CalendarSyncService ❌
`/src/lib/calendar-sync.ts` method `pullFromNotion()`:
- ❌ Just returns empty array (stub implementation)

## The Fix

Add database persistence to `pullFromGoogleCalendar()` and `pullFromNotion()`:

```typescript
// Inside pullFromGoogleCalendar() loop:
for (const googleEvent of response.data.items || []) {
  const unifiedEvent = this.convertFromGoogleEvent(googleEvent)

  // NEW: Save to database
  const dbEvent = await prisma.event.create({
    data: {
      type: 'EVENT',
      title: unifiedEvent.title,
      startDateTime: unifiedEvent.startDateTime,
      // ... other fields
    }
  })

  // NEW: Track sync
  await prisma.eventSync.create({
    data: {
      eventId: dbEvent.id,
      integrationId: integration.id,
      provider: 'GOOGLE',
      externalId: googleEvent.id,
      syncStatus: 'SYNCED',
      // ... other fields
    }
  })

  events.push(unifiedEvent)
}
```

## Files to Fix

1. `/src/lib/calendar-sync.ts`
   - Line 360-370: Add database save in `pullFromGoogleCalendar()`
   - Line 410-417: Implement `pullFromNotion()` (currently stub)

## Test After Fix

1. Create event in Google Calendar
2. Call `/api/calendar/google/sync` with integrationId
3. Check database: `SELECT * FROM "Event" ORDER BY "createdAt" DESC LIMIT 10;`
4. Open Becky CRM calendar UI
5. Event should appear!

## Reference Implementation

See `/src/app/api/calendar/sync/notion/pull/route.ts` (lines 100-210) for correct pattern.
