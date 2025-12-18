<objective>
Refactor the month view multi-day event creation UX with two improvements:
1. Reposition Start Date and End Date input fields in the EventCreationForm to appear below title and description
2. Change default behavior for multi-day events created via double-click drag to be 15-minute recurring events (daily) instead of all-day events

This improves the user experience by making date fields more prominent during multi-day event creation and providing sensible defaults for typical scheduling patterns.
</objective>

<context>
This is a Next.js calendar application with React components. The month view allows users to create events by double-click dragging across multiple day columns. Currently:
- Date fields may not be prominently positioned in the Create Event form
- Multi-day events default to spanning all days as a single event
- The user expects multi-day placeholder creation to result in daily recurring 15-minute events by default

Key files to examine:
- `./src/components/sidebar/EventCreationForm.tsx` - The form component in the Action Sidebar
- `./src/components/ScheduleCalendar.tsx` - Month view calendar component
- `./src/components/UnifiedDailyPlanner.tsx` - Handles event creation logic
- `./src/hooks/useUnifiedEvents.ts` - Event state management
</context>

<requirements>
**Part 1: Reposition Date Fields**
1. In EventCreationForm, move the Start Date and End Date input fields to appear directly below the Title and Description fields
2. Maintain proper form field grouping and visual hierarchy
3. Ensure date fields remain functionally connected to existing date state logic

**Part 2: Multi-Day Event Defaults for Month View**
1. When a user double-click drags across multiple days in month view to create an event:
   - Default duration should be 15 minutes (not all-day)
   - Daily recurrence should be automatically enabled
   - The recurrence should span from the start date to the end date of the drag range
2. The "All-day" toggle should NOT be automatically enabled for multi-day selections
3. Only if the user explicitly toggles "All-day" should the multi-day event option become available
4. The EventCreationForm must display the recurring event details (daily recurrence, date range) when this scenario occurs
5. Ensure the form state properly reflects: start date, end date (for recurrence range), 15-minute default duration, daily recurrence pattern

**Behavior Summary:**
- Single day click/drag: Creates single 15-minute event (existing behavior)
- Multi-day drag in month view: Creates recurring 15-minute event that repeats daily from start date to end date
- All-day toggle: Only then should the event be treated as a single spanning event across multiple days
</requirements>

<implementation>
1. First, read and understand the current EventCreationForm structure
2. Identify where date fields are currently positioned and move them below title/description
3. Update the event creation flow for month view to:
   - Detect when multiple days are selected
   - Set default duration to 15 minutes instead of all-day
   - Enable daily recurrence automatically
   - Pass recurrence configuration to the form
4. Update EventCreationForm to display recurrence details when applicable
5. Add logic to only show multi-day spanning option when "All-day" is explicitly enabled

**What to avoid:**
- Do not break existing single-day event creation behavior
- Do not modify week view or day view event creation behavior (only month view)
- Do not remove the all-day option - just change the default behavior
</implementation>

<output>
Modify the following files:
- `./src/components/sidebar/EventCreationForm.tsx` - Reposition date fields, display recurrence info
- `./src/components/ScheduleCalendar.tsx` - Update month view multi-day selection defaults (if applicable)
- `./src/components/UnifiedDailyPlanner.tsx` - Update event creation logic for multi-day scenarios
- Any other files necessary to implement the recurrence default behavior
</output>

<verification>
Before declaring complete, verify:
1. Date fields (Start Date, End Date) appear below Title and Description in EventCreationForm
2. In month view, double-click dragging across 3 days creates a form with:
   - 15-minute duration (not all-day)
   - Daily recurrence enabled
   - Start and end dates showing the range
3. Toggling "All-day" changes the behavior to multi-day spanning event
4. Single-day event creation still works as expected
5. Week view and day view event creation remain unchanged
6. Run `npm run build` to ensure no TypeScript errors
</verification>

<success_criteria>
- Date fields are repositioned below title and description in the form
- Multi-day drag in month view defaults to 15-minute recurring daily event
- Form displays daily recurrence configuration for multi-day selections
- All-day toggle works correctly to enable multi-day spanning mode
- No regression in other calendar views or single-day event creation
- Build passes without errors
</success_criteria>
