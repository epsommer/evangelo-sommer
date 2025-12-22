<objective>
Implement vertical resizing of recurring events in the monthly calendar view to convert daily recurring events to weekly recurring events when the user extends events upward or downward using top/bottom resize handles.

When a user drags a recurring event (or placeholder) vertically to span into a previous or next week row, the system should:
1. Create linked event records for each additional week spanned
2. Preserve the exact day span (e.g., Mon-Wed stays Mon-Wed in each week)
3. Support both saved events and unsaved placeholders during creation
</objective>

<context>
This is a Next.js calendar application using Prisma for database access. The month view displays recurring events that can span multiple days within a week (multi-day events).

Current behavior: Daily recurring events display as continuous horizontal spans. Vertical resize handles exist but do not convert the recurrence pattern when extended to other weeks.

Target behavior: Extending upward should create event instances in the previous week(s). Extending downward should create event instances in the following week(s). Each week should maintain the exact same day span as the original.

@src/components/ScheduleCalendar.tsx - Month view calendar component
@src/hooks/useEventResize.ts - Event resize handling
@src/utils/calendar/resizeCalculations.ts - Resize calculation utilities
@prisma/schema.prisma - Database schema for events
@src/app/api/events/route.ts - Events API endpoints
</context>

<research>
Before implementing, thoroughly analyze:
1. How recurring events are currently stored in the Prisma schema
2. How the existing resize handles detect vertical vs horizontal resizing
3. What fields link recurring event instances together (e.g., recurrenceGroupId)
4. How the month view renders multi-day spanning events
5. The current API endpoints for creating/updating recurring events
</research>

<requirements>
<functional>
1. Detect vertical resize direction (top handle = extend upward, bottom handle = extend downward)
2. Calculate which week row(s) the resize extends into
3. Create new event records in the database for each additional week:
   - Link via recurrenceGroupId or similar field
   - Copy event properties (title, duration, type, color, etc.)
   - Set start/end dates to match the exact same days of the new week
4. Handle placeholder resizing during event creation (before save)
5. Handle saved event resizing (create new linked instances)
6. Multi-day events (e.g., Mon-Wed) must create Mon-Wed spans in each new week
7. Support incremental extension (can extend one week at a time with multiple resizes)
</functional>

<data_model>
When converting daily to weekly recurrence:
- Create separate database records for each week occurrence
- Link records with a shared recurrenceGroupId (or create this field if missing)
- Each record stores its own startDateTime and endDateTime for that week
- Include recurrencePattern field to indicate "weekly" recurrence type
</data_model>

<ui_behavior>
- Visual feedback during resize should show the event expanding into new week rows
- The placeholder/event width should be duplicated in the target week row
- Cancel resize (Escape or click away) should revert without creating records
- Confirmation may be needed before converting (follow existing resize confirmation patterns)
</ui_behavior>

<deletion_behavior>
When user deletes a weekly recurring event:
- Show modal asking "Delete this occurrence" or "Delete all occurrences"
- "This occurrence" removes only the clicked instance
- "All occurrences" removes all linked events in the recurrence group
</deletion_behavior>
</requirements>

<implementation>
<step_1>
Research the current codebase structure:
1. Examine the Prisma schema for Event model and any recurrence-related fields
2. Review useEventResize.ts for existing resize logic
3. Understand how ScheduleCalendar.tsx renders multi-week recurring events
4. Check if recurrenceGroupId or similar linking mechanism exists
</step_1>

<step_2>
Update the database schema if needed:
1. Add recurrenceGroupId field to Event model if not present
2. Add recurrencePattern enum or field (daily, weekly, monthly, etc.)
3. Create a migration for schema changes
</step_2>

<step_3>
Modify resize detection logic:
1. In useEventResize.ts, detect when resize is vertical (row change in month grid)
2. Calculate the target week(s) based on resize direction and distance
3. Determine the day span that needs to be preserved (startDay to endDay of week)
</step_3>

<step_4>
Implement backend API for weekly recurrence creation:
1. Create endpoint to convert event to weekly recurrence
2. Accept: sourceEventId, targetWeeks array, recurrenceGroupId
3. Validate that new week dates don't conflict with existing events
4. Create linked event records for each target week
5. Return the complete set of linked events
</step_4>

<step_5>
Update frontend to call API after resize confirmation:
1. On resize end, calculate which weeks are now spanned
2. Show confirmation modal if creating new week instances
3. Call API to create linked weekly events
4. Refresh calendar display with new events
</step_5>

<step_6>
Handle placeholder resizing (before save):
1. During event creation, track multi-week extension in local state
2. When saving, include all week instances in the create request
3. Ensure all instances are created atomically with same recurrenceGroupId
</step_6>

<step_7>
Implement delete behavior for weekly recurring events:
1. Add modal with "Delete this occurrence" / "Delete all" options
2. "This occurrence" → DELETE single event by ID
3. "Delete all" → DELETE all events WHERE recurrenceGroupId matches
</step_7>
</implementation>

<constraints>
- Maintain backward compatibility with existing non-recurring events
- Follow existing code patterns and naming conventions in the codebase
- Use existing confirmation modal patterns (e.g., ResizeConfirmationModal)
- Ensure database transactions are atomic when creating multiple linked records
- Handle edge cases: resize across month boundaries, resize to same week (no-op)
</constraints>

<output>
Modify/create files as needed. Expected changes include:
- `prisma/schema.prisma` - Add recurrence fields if needed
- `src/hooks/useEventResize.ts` - Vertical resize detection
- `src/utils/calendar/resizeCalculations.ts` - Week span calculations
- `src/app/api/events/route.ts` - API for creating/deleting linked events
- `src/components/ScheduleCalendar.tsx` - Visual feedback for multi-week resize
- `src/components/ResizeConfirmationModal.tsx` - Confirmation for weekly conversion
- Create migration if schema changes
</output>

<verification>
Before declaring complete, verify:
1. Run `npx prisma generate` if schema changed
2. Run `npm run build` to check for TypeScript errors
3. Test scenarios:
   - Create new event, resize vertically to span 2 weeks, save
   - Resize existing daily event downward to create weekly recurrence
   - Resize multi-day event (Mon-Wed) to verify span preservation
   - Delete single occurrence vs all occurrences
   - Cancel resize mid-drag to verify no data changes
</verification>

<success_criteria>
- Vertical resize handle drags on recurring events create linked weekly instances
- Each week instance maintains the exact same day span as the original
- Both saved events and creation placeholders support vertical resize
- Delete modal offers "this occurrence" or "all occurrences" choice
- No TypeScript errors, build passes
- Existing horizontal resize and non-recurring events still work
</success_criteria>
