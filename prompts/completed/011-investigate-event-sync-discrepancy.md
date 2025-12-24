<objective>
Investigate and fix why Google Calendar and Notion Calendar display events that are not appearing in Becky CRM's calendar.

Determine the root cause of the sync discrepancy - whether events are not being pulled from external calendars, not being stored correctly, or not being displayed in the UI.
</objective>

<context>
Becky CRM integrates with:
- Google Calendar via OAuth
- Notion Calendar via API

Key files to examine:
- `@src/app/api/calendar/google/sync/route.ts` - Google Calendar sync endpoint
- `@src/app/api/calendar/sync/notion/pull/route.ts` - Notion Calendar pull endpoint
- `@src/lib/calendar-sync.ts` - Calendar sync service
- `@src/lib/calendar-service.ts` - Calendar service utilities
- `@src/hooks/useUnifiedEvents.ts` - Frontend event state management
- `@prisma/schema.prisma` - Database schema for events

The issue could be at multiple levels:
1. API sync not pulling events correctly
2. Events not being stored in database
3. Events stored but not returned by API
4. Events returned but not displayed in UI
</context>

<research>
1. **Trace the sync flow:**
   - Check how sync is triggered (manual button, webhook, scheduled)
   - Review the sync endpoint logic for both Google and Notion
   - Identify any filtering or date range limitations

2. **Check database storage:**
   - Verify events from external sources are being saved
   - Check for any transformation issues (dates, timezones)
   - Look for source identification fields (googleCalendarId, notionPageId, etc.)

3. **Review API responses:**
   - Check what the events API returns
   - Look for any filtering by source or status

4. **UI rendering:**
   - Verify useUnifiedEvents returns all event types
   - Check if there's any client-side filtering
</research>

<debugging_steps>
1. Add logging to Google sync endpoint:
   - Log events received from Google API
   - Log events being created/updated in database

2. Add logging to Notion sync endpoint:
   - Log pages/events received from Notion
   - Log database operations

3. Query database directly:
   - Check Event table for external source events
   - Verify counts match expected values

4. Check frontend:
   - Log events returned by useUnifiedEvents hook
   - Compare with database query results
</debugging_steps>

<output>
Create a diagnostic report at `./analyses/event-sync-discrepancy-report.md` containing:
1. Sync flow diagram
2. Where events are being lost (if applicable)
3. Root cause identification
4. Recommended fix with code changes
</output>

<verification>
1. Connect to Google Calendar with test events
2. Verify all events appear in Becky CRM after sync
3. Connect to Notion Calendar with test events
4. Verify all events appear after sync
5. Confirm event counts match across all three systems
</verification>

<success_criteria>
- Root cause identified and documented
- Events from Google Calendar correctly display in Becky CRM
- Events from Notion Calendar correctly display in Becky CRM
- No manual intervention required after initial sync
</success_criteria>
