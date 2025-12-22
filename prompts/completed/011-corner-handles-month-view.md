<objective>
Analyze and document the corner handle resize operations for placeholder and scheduled events in the month view of the Time Manager calendar. Ensure scheduled events have functional corner handles that allow users to expand event containers to fill all days within a week row, with consistent behavior across all event types (recurring, all-day, multi-day, and standard events).
</objective>

<context>
This is the Becky CRM Time Manager application built with Next.js, React, and TypeScript. The month view calendar displays events that can be resized using handles. Currently, placeholder events support corner handle operations for continuous extension. This task ensures scheduled (existing) events have the same corner handle functionality.

Key files to examine:
- `src/components/ScheduleCalendar.tsx` - Main month view calendar component
- `src/hooks/useEventResize.ts` - Resize hook handling all resize operations
- `src/utils/calendar/resizeCalculations.ts` - Utility functions for resize calculations
- `src/components/calendar/CalendarEvent.tsx` - Event component with resize handles

The corner handle functionality should use "continuous extension mode" - when dragging a corner across week rows, the event spans all days between start and end, rather than creating weekly recurring instances.
</context>

<research>
Thoroughly analyze the existing codebase to understand:

1. **Placeholder corner handle operations**:
   - How are corner handles rendered on placeholder events?
   - What functions handle corner resize start, move, and end?
   - How does `detectVerticalWeekResize` work with corner handles?
   - How does `isCornerResize` flag affect behavior?

2. **Scheduled event resize operations**:
   - Do scheduled events currently have all 8 resize handles (4 edges + 4 corners)?
   - How are resize handles rendered in `CalendarEvent.tsx`?
   - What is the current behavior when using corner handles on scheduled events?

3. **Event type handling**:
   - How are recurring events identified and handled during resize?
   - How are all-day events handled differently from timed events?
   - How are multi-day events (isMultiDay flag) treated during resize?

4. **Continuous extension mode**:
   - How does `calculateContinuousWeekExtension` work?
   - How does `getVerticalWeekResizePreviewForRow` show preview for corner resizes?
   - What is the difference between weekly recurrence mode and continuous extension mode?
</research>

<requirements>
1. **Document current implementation**:
   - Create a clear map of functions involved in corner handle operations
   - Document the data flow from mouse events to database updates
   - Identify any gaps where scheduled events don't have corner handle support

2. **Verify scheduled event corner handles**:
   - Confirm all 8 resize handles (top, bottom, left, right, top-left, top-right, bottom-left, bottom-right) are present
   - Verify corner handles trigger continuous extension mode via `isCornerResize` flag
   - Ensure visual preview shows correct day span during corner resize

3. **Event type consistency**:
   - Verify corner handles work for standard (non-recurring, single-day) events
   - Verify corner handles work for multi-day events
   - Verify corner handles work for all-day events
   - Verify corner handles work for recurring events (should extend the single instance, not create new recurrences)

4. **Fix any issues found**:
   - If scheduled events lack corner handles, add them
   - If corner handles don't trigger continuous extension, fix the logic
   - If event types are handled inconsistently, unify the behavior
</requirements>

<implementation>
Use the existing patterns in the codebase:

1. Corner handles should use `isCornerHandle()` utility from `resizeCalculations.ts`
2. When `isCornerResize: true` in `VerticalResizeWeekInfo`, use continuous extension mode
3. The `handleVerticalWeekResize` callback should check `weekInfo.isCornerResize` to determine mode
4. Preview should show continuous spanning (first week to Saturday, intermediate weeks full, last week from Sunday)

Avoid:
- Creating new weekly recurring instances when using corner handles (that's for edge handles only)
- Breaking existing placeholder corner handle functionality
- Changing behavior for non-corner resize operations
</implementation>

<output>
1. **Analysis document**: Save findings to `./CORNER_HANDLES_ANALYSIS.md` with:
   - Function map showing all corner handle related functions
   - Data flow diagram (text-based)
   - Current state of scheduled event corner handle support
   - Any issues found and how they were fixed

2. **Code changes**: Modify necessary files to ensure:
   - Scheduled events have functional corner handles
   - Corner handles use continuous extension mode for all event types
   - Behavior is consistent across recurring/all-day/multi-day/standard events
</output>

<verification>
Before declaring complete, verify:

1. Run TypeScript type check: `npx tsc --noEmit`
2. Manually test (describe steps to test):
   - Create a placeholder event via double-click drag, use corner handles to extend across weeks
   - Create a scheduled event, verify corner handles are visible
   - Use corner handle on scheduled event to extend across weeks - should fill all days
   - Test with an all-day event - same corner handle behavior expected
   - Test with a multi-day event - same corner handle behavior expected
</verification>

<success_criteria>
- All corner handle related functions are documented
- Scheduled events have all 8 resize handles including corners
- Corner handles on scheduled events trigger continuous extension (not weekly recurrence)
- Corner handle behavior is identical for all event types
- TypeScript compiles without errors related to changes
- Analysis document clearly explains the implementation
</success_criteria>
