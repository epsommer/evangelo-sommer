<objective>
Fix the drag-drop minute snapping bug in the calendar where dragging events to 15, 30, or 45 minute time slots incorrectly snaps them to the 0-minute position of the hour.

Currently, when a user drags an event to a specific 15-minute interval (e.g., 9:30), the event is being placed at the hour boundary (e.g., 9:00) instead of the intended minute position.
</objective>

<context>
This is a Next.js calendar application with a time manager feature. The drag-drop functionality is implemented using a custom DragDropContext.

Key files to examine:
- `src/components/DragDropContext.tsx` - Manages drag state and drop zone detection
- `src/utils/calendar/dragCalculations.ts` - Calculates new event times after drag-drop
- `src/components/DropZone.tsx` - Individual drop zone components for time slots
- `src/components/WeekView.tsx` - Week view that renders the calendar grid
- `src/components/UnifiedDailyPlanner.tsx` - Daily planner component

From the console logs, the issue appears to be in how the drop target minute information is passed or calculated:
```
dragCalculations.ts:55 Drop target: Object
dragCalculations.ts:98 Calculated times: Object
```

The drop zones exist for each 15-minute interval, but the minute value may not be correctly preserved when passed to `calculateDragDropTimes`.
</context>

<requirements>
1. Examine the `setActiveDropZone` function in DragDropContext.tsx to verify the minute value is being captured correctly
2. Check how DropZone components pass their minute information (should be 0, 15, 30, or 45)
3. Verify `calculateDragDropTimes` in dragCalculations.ts correctly uses the target minute value
4. Ensure the minute value flows correctly through the entire drag-drop chain:
   - DropZone → setActiveDropZone → endDrag → onEventDrop → calculateDragDropTimes → API update
5. Fix any location where the minute value is being lost, defaulted to 0, or not properly propagated
</requirements>

<implementation>
Debug approach:
1. Add temporary console.log statements to trace the minute value through the flow
2. Identify where the minute value is being dropped or set to 0
3. Fix the root cause - likely in one of these areas:
   - DropZone not passing correct minute to setActiveDropZone
   - DragDropContext not storing/retrieving minute correctly
   - dragCalculations.ts ignoring or overwriting the minute value

Expected behavior after fix:
- Dragging an event to 9:15 slot should result in startDateTime of XX:15
- Dragging an event to 9:30 slot should result in startDateTime of XX:30
- Dragging an event to 9:45 slot should result in startDateTime of XX:45
</implementation>

<output>
Modify the necessary files to fix the minute snapping issue. Primary candidates:
- `./src/components/DragDropContext.tsx`
- `./src/utils/calendar/dragCalculations.ts`
- `./src/components/DropZone.tsx` (if it exists separately)
</output>

<verification>
Before completing:
1. Remove any debug console.log statements added during investigation
2. Test by dragging an event to each 15-minute interval (0, 15, 30, 45) and verify it lands at the correct time
3. Verify the API PUT request contains the correct startDateTime and endDateTime with proper minutes
4. Ensure the fix doesn't break other drag-drop functionality (changing days, different hours)
</verification>

<success_criteria>
- Events dragged to 15-minute slots land at the exact minute position selected
- No console errors during drag-drop operations
- Event times are correctly persisted to the database
- Visual position matches the actual stored time
</success_criteria>
