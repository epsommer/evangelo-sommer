<objective>
Fix the "+N more multi-day events" popover indicator for recurring events that span multiple week rows.

When a user creates a recurring event spanning several days and extends it vertically across multiple week rows, only the first week row displays the overflow indicator popover button. Subsequent week rows with the same recurring event instances do not show the "+N more" indicator even when there are more than 2 multi-day events.
</objective>

<context>
The Time Manager calendar has a month view with:
- Multi-day events rendered as overlays above day cells
- Maximum of 2 visible multi-day events per week row
- A "+N more multi-day events" indicator with Popover for overflow

Key files to examine:
- `@src/components/ScheduleCalendar.tsx` - Main calendar component with multi-day event rendering
- `@src/utils/calendar/resizeCalculations.ts` - Handles vertical week resize calculations
- `@src/hooks/useUnifiedEvents.ts` - Event state management
- `@src/app/api/events/weekly-recurrence/route.ts` - API for creating weekly recurring events

The recurring events are created with a `recurrenceGroupId` linking all instances together.
</context>

<research>
1. Analyze `getMultiDayEventsForWeekRow()` function in ScheduleCalendar.tsx
   - Determine how it filters events for each week row
   - Check if recurring event instances are being correctly identified for each week

2. Examine how weekly recurring events are created:
   - Review the weekly-recurrence API endpoint
   - Verify each instance has correct start/end dates for its respective week

3. Trace the rendering logic:
   - Find where `multiDayEvents.length > 2` condition is evaluated
   - Determine if the same events are being counted multiple times or not at all in subsequent weeks
</research>

<requirements>
1. Each week row should independently evaluate its multi-day events count
2. If a week row has more than 2 multi-day events (including recurring instances), it should display the "+N more" indicator
3. The indicator should open a Popover showing all multi-day events for that specific week row
4. Recurring event instances should be treated as separate events for counting purposes in each week
</requirements>

<implementation>
1. Debug by adding console logs to `getMultiDayEventsForWeekRow()` showing:
   - Week row date range
   - Number of events found
   - Event IDs and their date ranges

2. Check the date filtering logic:
   - Verify recurring instances have distinct start/end dates per week
   - Ensure the week-row filtering logic captures events correctly

3. Fix the issue:
   - Modify the filtering logic if events are being missed
   - Or fix the event creation if instances are duplicated/missing
</implementation>

<verification>
1. Create a multi-day event (e.g., Monday-Wednesday)
2. Use vertical resize to extend it across 3+ week rows (creating weekly recurrence)
3. Verify each week row shows the "+N more" indicator when appropriate
4. Click each indicator to confirm the popover shows the correct events for that week
</verification>

<success_criteria>
- Every week row independently shows the overflow indicator when it has more than 2 multi-day events
- Clicking the indicator on any week row opens a popover with that week's events only
- Recurring event instances are correctly counted per week row
</success_criteria>
