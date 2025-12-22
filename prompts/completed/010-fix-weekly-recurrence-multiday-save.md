<objective>
Fix the bug where saving a multi-day placeholder event (e.g., spanning 4 day columns) extended across multiple week rows using the vertical resize "repeater handle" results in incorrect event creation.

Current broken behavior:
1. User creates placeholder spanning 4 days (e.g., Tue-Fri)
2. User drags bottom handle to extend across 3 week rows (Repeat × 3)
3. On save, only the FIRST day of the THIRD week appears initially
4. After clicking elsewhere, events update to show as SINGLE-DAY events on Monday of each week

Expected correct behavior:
- 3 separate multi-day events should be created
- Each event spans the SAME 4-day range (Tue-Fri) on consecutive weeks
- Week 1: Tue-Fri, Week 2: Tue-Fri (next week), Week 3: Tue-Fri (week after)
</objective>

<context>
This is a Next.js calendar application using:
- React 19 with TypeScript
- Prisma ORM with PostgreSQL
- Custom calendar components in src/components/

Key files to investigate:
- `src/components/ScheduleCalendar.tsx` - Main calendar, handles placeholder state and vertical resize
- `src/components/sidebar/EventCreationForm.tsx` - Form that receives placeholder data
- `src/app/api/events/weekly-recurrence/route.ts` - API endpoint for creating weekly recurring events
- `src/hooks/useUnifiedEvents.ts` - Event CRUD operations
- `prisma/schema.prisma` - Event model with recurrenceGroupId field

The vertical resize feature uses `placeholderVerticalPreview` state to track:
- `weekCount`: Number of weeks being extended (e.g., 3)
- `initialWeekRow`: Starting week row
- Week-spanning events should preserve the horizontal day span
</context>

<research>
Before implementing fixes, trace the complete data flow:

1. **Placeholder State**: In ScheduleCalendar.tsx, examine how vertical resize updates:
   - `placeholder.date` and `placeholder.endDate` (horizontal span)
   - `placeholderVerticalPreview` state (week count)
   - `handlePlaceholderChange` callback - what data is passed?

2. **Form Data**: In EventCreationForm.tsx, verify:
   - What props does it receive from placeholder?
   - Are `weeklyRecurrenceEnd` and `weeklyRecurrenceCount` being set?
   - How does it compute start/end dates for each recurrence?

3. **API Payload**: Check what the frontend sends to the weekly-recurrence endpoint:
   - Is the day span (startDate to endDate) included?
   - Is weeklyRecurrenceCount correct?
   - Log the request body to verify

4. **API Handler**: In route.ts, examine:
   - How does it calculate dates for each recurring event?
   - Is it using the day span or just the start date?
   - What is actually being inserted into the database?
</research>

<requirements>
1. **Preserve day span**: When creating weekly recurring events, each instance must maintain the same day span as the original placeholder (e.g., 4 days Tue-Fri)

2. **Correct date calculation**: Each recurring event should start on the same weekday but offset by 7 days per recurrence:
   - Week 1: startDate to endDate (original span)
   - Week 2: startDate + 7 days to endDate + 7 days
   - Week 3: startDate + 14 days to endDate + 14 days

3. **Data flow integrity**: Ensure all necessary data flows from:
   - ScheduleCalendar placeholder state → handlePlaceholderChange
   - handlePlaceholderChange → EventCreationForm props
   - EventCreationForm → API request body
   - API handler → Prisma create operations

4. **Immediate UI update**: After saving, all created events should appear correctly without requiring a click elsewhere
</requirements>

<implementation>
Likely fix areas:

**If issue is in placeholder → form data flow:**
- Update `handlePlaceholderChange` in page.tsx to pass both `date` and `endDate` for the horizontal span
- Ensure `weeklyRecurrenceCount` is passed correctly

**If issue is in form → API payload:**
- EventCreationForm must include BOTH startDate AND endDate in the API request
- Format: `{ startDate, endDate, weeklyRecurrenceCount, ... }`

**If issue is in API handler:**
- The weekly-recurrence route must calculate each event's start AND end:
```typescript
for (let i = 0; i < weeklyRecurrenceCount; i++) {
  const eventStart = addDays(startDate, i * 7);
  const eventEnd = addDays(endDate, i * 7);  // MUST preserve the span
  // Create event with eventStart and eventEnd
}
```

**If issue is optimistic UI update:**
- After successful API response, ensure the events array in useUnifiedEvents is updated with ALL created events, not just the last one
</implementation>

<constraints>
- Do NOT remove existing functionality for single-day recurring events
- Preserve the recurrenceGroupId linking for batch deletion
- Maintain compatibility with existing saved events
- Remove any debug console.log statements after fixing
</constraints>

<verification>
Test the fix with this exact scenario:

1. Go to month view calendar
2. Click and drag horizontally to create a 4-day placeholder (e.g., Tue Dec 10 - Fri Dec 13)
3. Use the bottom resize handle to extend down 2 more week rows (total 3 weeks)
4. Confirm the placeholder preview shows "Repeat × 3"
5. Fill in event details and save
6. VERIFY: 3 events should appear immediately, each spanning Tue-Fri of their respective weeks:
   - Dec 10-13
   - Dec 17-20
   - Dec 24-27
7. Refresh the page and verify events persist correctly
8. Delete one event and confirm the recurrenceGroupId batch delete option appears
</verification>

<output>
Modify the necessary files to fix this bug. Focus on:
- `src/app/api/events/weekly-recurrence/route.ts`
- `src/components/sidebar/EventCreationForm.tsx`
- `src/components/ScheduleCalendar.tsx` (if placeholder data is incomplete)
- `src/app/time-manager/page.tsx` (if handlePlaceholderChange is missing data)
</output>

<success_criteria>
- Multi-day events created via vertical resize maintain their day span across all recurrences
- All recurring events appear immediately after save (no click-away required)
- Events persist correctly after page refresh
- No TypeScript errors or console warnings
- Existing single-day recurring events continue to work
</success_criteria>
