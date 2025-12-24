<objective>
Fix the critical bug where events fetched from Google Calendar are never persisted to the database.

Currently, `pullFromGoogleCalendar()` in `src/lib/calendar-sync.ts` successfully retrieves events from the Google Calendar API but only returns them - it never saves them to the database. This causes events to exist only in component state and disappear on page refresh.
</objective>

<context>
This is part of fixing the broken calendar sync in the Time Manager feature. The investigation report at `./analyses/calendar-sync-investigation.md` identified this as the root cause of inbound sync failures.

Key files:
- @src/lib/calendar-sync.ts - The `pullFromGoogleCalendar()` function that needs modification
- @src/lib/calendar-service.ts - Calendar service layer with useful patterns
- @prisma/schema.prisma - Event and EventSync models for database structure
- @src/app/api/calendar/google/sync/route.ts - API endpoint that calls the sync function

The existing outbound sync (web app → Google) works correctly and can serve as a pattern reference.
</context>

<requirements>
1. Modify `pullFromGoogleCalendar()` to persist fetched events to the database using Prisma

2. For each event from Google Calendar:
   - Check if an EventSync record exists mapping to this Google event ID
   - If exists: Update the local Event with latest data from Google
   - If not exists: Create new Event AND corresponding EventSync record

3. Use `prisma.event.upsert()` for atomic create-or-update operations

4. Create EventSync records to track the mapping between local event IDs and Google Calendar event IDs

5. Handle the following fields from Google Calendar events:
   - title (from summary)
   - description
   - startDateTime
   - endDateTime
   - location
   - External event ID for mapping

6. Preserve any local-only fields that shouldn't be overwritten by Google data
</requirements>

<implementation>
Reference the existing EventSync model structure from the schema:
```
model EventSync {
  id             String   @id @default(cuid())
  eventId        String
  integrationId  String
  externalId     String
  lastSyncedAt   DateTime
  syncStatus     String
  event          Event    @relation(...)
  integration    CalendarIntegration @relation(...)
}
```

Pattern to follow:
```typescript
for (const googleEvent of events) {
  // Find existing sync record
  const existingSync = await prisma.eventSync.findFirst({
    where: {
      externalId: googleEvent.id,
      integrationId: integration.id
    },
    include: { event: true }
  });

  if (existingSync) {
    // Update existing event
    await prisma.event.update({
      where: { id: existingSync.eventId },
      data: { /* mapped fields */ }
    });
  } else {
    // Create new event and sync record
    const newEvent = await prisma.event.create({
      data: { /* mapped fields */ }
    });
    await prisma.eventSync.create({
      data: {
        eventId: newEvent.id,
        integrationId: integration.id,
        externalId: googleEvent.id,
        lastSyncedAt: new Date(),
        syncStatus: 'synced'
      }
    });
  }
}
```
</implementation>

<output>
Modify these files:
- `./src/lib/calendar-sync.ts` - Add database persistence to `pullFromGoogleCalendar()`

No new files needed.
</output>

<verification>
Before completing:
- [ ] Events from Google Calendar are saved to the database
- [ ] EventSync records are created for each imported event
- [ ] Duplicate imports are prevented (upsert logic works)
- [ ] Code compiles without TypeScript errors (`npm run type-check`)
- [ ] Existing outbound sync still works (no regressions)
</verification>

<success_criteria>
- Events fetched from Google Calendar persist in the database
- Page refresh shows the same events (not lost from component state)
- EventSync table has records mapping local IDs to Google event IDs
- Re-running sync updates existing events rather than creating duplicates
</success_criteria>
</content>
