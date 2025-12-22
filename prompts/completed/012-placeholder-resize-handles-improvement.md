<objective>
Improve the placeholder event resize handle behavior in the time-manager month-view calendar. Currently, placeholder events (created via drag-selection) need enhanced resize capabilities including vertical handles, corner handles, and proper horizontal boundary constraints.
</objective>

<context>
This is a Next.js 15 calendar application using React. The month-view calendar allows users to create placeholder events by dragging across day cells (e.g., Mon-Thu). These placeholder events need proper resize handles so users can adjust them before finalizing.

Key files to examine:
- `src/components/ScheduleCalendar.tsx` - Main calendar component with placeholder state
- `src/components/calendar/CalendarEvent.tsx` - Event rendering with resize handles
- `src/hooks/useEventResize.ts` - Resize logic and handle detection
- `src/utils/calendar/resizeCalculations.ts` - Resize calculation utilities

Current behavior:
- Placeholder events are created via mouse drag in month-view
- Actual events have resize handles (top, bottom, left, right, corners)
- Placeholder events may not have all resize handles properly wired up
</context>

<requirements>
1. **Vertical Handles on Placeholder Events**
   - Top and bottom resize handles should appear when user hovers over a placeholder event
   - Handles should only appear AFTER the initial drag-creation is released (not during creation)
   - Vertical resize should create recurring weekly events (duplicate to other week rows)

2. **Corner Handle Operations**
   - Add corner handles (top-left, top-right, bottom-left, bottom-right) to placeholder events
   - Corner handles should resize BOTH horizontally AND vertically simultaneously
   - Horizontal component: Adjust start/end dates within the week
   - Vertical component: Extend to other week rows (create recurring events)

3. **Horizontal Handle Boundary Constraint**
   - Left and right handles (and horizontal component of corners) must NOT extend past the week row boundary
   - Maximum right extent: Saturday (day index 6) of the current week row
   - Minimum left extent: Sunday (day index 0) of the current week row
   - Events cannot span across week rows via horizontal resize - that's what vertical resize is for

4. **Visual Consistency**
   - Placeholder handles should match the styling of regular event handles
   - Use the same hover states and cursor indicators
   - Maintain the dashed border visual for placeholders during resize
</requirements>

<implementation>
Step 1: Examine current placeholder event rendering in ScheduleCalendar.tsx
- Find where placeholder events are rendered in month view
- Identify if they use CalendarEvent component or custom rendering

Step 2: Update placeholder event to include all resize handles
- Ensure CalendarEvent is used (or port its handle logic)
- Wire up onResizeStart, onResizeMove, onResizeEnd callbacks for placeholders

Step 3: Implement week boundary constraint for horizontal resize
- In useEventResize.ts or resizeCalculations.ts, add boundary clamping
- When calculating new dates from horizontal resize:
  - Get the week row the event is in (Sunday-Saturday)
  - Clamp left handle to >= weekStart (Sunday)
  - Clamp right handle to <= weekEnd (Saturday)

Step 4: Implement corner handle dual-axis resize
- Corner handles should trigger both horizontal date change AND vertical week extension
- Use existing detectVerticalWeekResize for the vertical component
- Use existing horizontal resize for the date component
- Combine both calculations when a corner handle is being dragged

Step 5: Ensure vertical handles create recurring events
- Vertical resize on placeholders should follow the same pattern as events
- Call the weekly-recurrence API or use the recurring event creation flow
- Preview should show "Repeat x N" label in extended rows

<constraints>
- Do NOT modify the edit event modal behavior
- Do NOT change how regular (non-placeholder) events resize
- Placeholder events should convert to real events via the existing creation flow
- Week boundary constraint applies to month-view only (week/day views have different behavior)
</constraints>
</implementation>

<output>
Modify the following files as needed:
- `./src/components/ScheduleCalendar.tsx` - Placeholder event rendering with handles
- `./src/hooks/useEventResize.ts` - Handle detection and boundary constraints
- `./src/utils/calendar/resizeCalculations.ts` - Boundary clamping functions
- `./src/components/calendar/CalendarEvent.tsx` - If placeholder-specific logic needed

Create any new utility functions needed for week boundary calculations.
</output>

<verification>
Test the following scenarios:
1. Create a Mon-Wed placeholder by dragging in month-view
2. Hover over the placeholder - verify top/bottom/corner handles appear
3. Drag right handle toward Saturday - verify it stops at Saturday
4. Drag right handle past Saturday - verify it clamps to Saturday
5. Drag left handle toward Sunday - verify it stops at Sunday
6. Drag bottom handle down one row - verify preview shows "Repeat x 2"
7. Drag bottom-right corner - verify both date AND week row change
8. Release resize - verify placeholder updates correctly
</verification>

<success_criteria>
- Placeholder events show all 8 resize handles (4 edges + 4 corners) on hover
- Horizontal resize is constrained to the current week row (Sun-Sat)
- Corner handles resize both dates and week rows simultaneously
- Vertical resize creates recurring event previews
- No regressions to regular event resize behavior
- Build passes with no TypeScript errors
</success_criteria>
