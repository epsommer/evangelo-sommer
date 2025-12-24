<objective>
Fix the silent failure in event deletion propagation to Google Calendar.

Currently, when deleting events locally, the code returns "success" even when no EventSync record exists, meaning the Google Calendar API delete is never called. Events get deleted from the local database but persist in Google Calendar.
</objective>

<context>
This is the third step in fixing calendar sync. The investigation found that deletion logic silently fails when EventSync records are missing.

Key files:
- @src/lib/calendar-sync.ts - Contains deletion sync logic
- @src/app/api/events/route.ts - DELETE handler that should trigger external deletion
- @analyses/calendar-sync-investigation.md - Full investigation with code references

The current problematic flow:
1. User deletes event locally
2. Code looks for EventSync record
3. If no record found → returns success (WRONG)
4. Google Calendar event remains

The correct flow should:
1. User deletes event locally
2. Look for EventSync record
3. If found → delete from Google Calendar
4. If not found → still succeed locally (event was never synced to external)
5. Provide accurate feedback about what was deleted
</context>

<requirements>
1. Modify the deletion flow to properly handle missing EventSync records:
   - If EventSync exists: Delete from both local DB and Google Calendar
   - If EventSync doesn't exist: Delete from local DB only (this is valid for local-only events)
   - Return accurate status indicating what was deleted

2. Add proper error handling for Google Calendar API delete failures:
   - If Google delete fails: Still delete locally, but report the failure
   - Don't silently swallow errors
   - Log the error for debugging

3. Clean up orphaned EventSync records:
   - After deleting an event, also delete the corresponding EventSync record
   - Handle cases where EventSync exists but external event was already deleted

4. Update the DELETE API response to include sync status:
   ```typescript
   {
     success: true,
     deletedLocally: true,
     deletedFromGoogle: true | false | 'not_synced',
     error?: string
   }
   ```

5. Handle batch deletions (if applicable)
</requirements>

<implementation>
Pattern for proper deletion handling:

```typescript
async function deleteEventWithSync(eventId: string, userId: string) {
  // Find all sync records for this event
  const syncRecords = await prisma.eventSync.findMany({
    where: { eventId },
    include: { integration: true }
  });

  const results = {
    deletedLocally: false,
    externalDeletions: [] as { provider: string; success: boolean; error?: string }[]
  };

  // Delete from external services first
  for (const sync of syncRecords) {
    try {
      if (sync.integration.provider === 'google') {
        await deleteFromGoogleCalendar(sync.externalId, sync.integration);
        results.externalDeletions.push({ provider: 'google', success: true });
      }
    } catch (error) {
      console.error(`Failed to delete from ${sync.integration.provider}:`, error);
      results.externalDeletions.push({
        provider: sync.integration.provider,
        success: false,
        error: error.message
      });
    }
  }

  // Delete sync records
  await prisma.eventSync.deleteMany({ where: { eventId } });

  // Delete local event
  await prisma.event.delete({ where: { id: eventId } });
  results.deletedLocally = true;

  return results;
}
```
</implementation>

<output>
Modify these files:
- `./src/lib/calendar-sync.ts` - Fix deletion sync logic
- `./src/app/api/events/route.ts` - Update DELETE handler to use improved logic
</output>

<verification>
Before completing:
- [ ] Deleting a synced event removes it from both local DB and Google Calendar
- [ ] Deleting a local-only event succeeds without errors
- [ ] Failed Google deletions are logged, not silently ignored
- [ ] EventSync records are cleaned up after deletion
- [ ] API response accurately reflects what was deleted
- [ ] Code compiles without TypeScript errors
</verification>

<success_criteria>
- Events deleted in web app are also deleted from Google Calendar
- No orphaned events remain in Google Calendar after local deletion
- Error messages are visible/logged when external deletion fails
- Local-only events can still be deleted without errors
</success_criteria>
</content>
