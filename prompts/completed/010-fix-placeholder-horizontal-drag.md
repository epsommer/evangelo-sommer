<objective>
Fix the placeholder event behavior during horizontal (cross-day) drag in the time-manager week view and month view.

Currently, when a user double-click-drags and moves the mouse horizontally across day columns, the placeholder box incorrectly jumps to fill 24 hours of the first double-clicked cell column. The placeholder should instead:

1. Track the actual mouse position across day cells
2. Maintain the vertical height based on the actual Y-distance dragged (not expand to 24 hours)
3. Move the start position to the correct day column as the mouse crosses day boundaries
4. Only expand to the 24-hour mark if the mouse Y position actually reaches the 24-hour boundary OR if the user explicitly specifies the time in the action sidebar
</objective>

<context>
This is part of the time-manager calendar application with event creation via double-click-and-hold drag.

Key files involved:
- `src/hooks/useEventCreationDrag.ts` - Core hook managing drag state and calculations
- `src/components/calendar/PlaceholderEvent.tsx` - Visual placeholder component
- `src/components/UnifiedDailyPlanner.tsx` - Main calendar view that renders events
- `src/components/WeekView.tsx` - Week view layout (if separate)

The drag hook already tracks:
- `startDate` / `currentDate` - The day columns
- `startHour` / `currentHour` - The hour positions
- `startMinutes` / `currentMinutes` - Precise minute positions
- `startDayIndex` / `currentDayIndex` - Column indices
- `duration` - Calculated duration in minutes
- `isMultiDay` - Boolean flag for multi-day events

The issue is in how duration and position are calculated when dragging horizontally.
</context>

<research>
Before implementing, analyze the existing code to understand:

1. How `useEventCreationDrag.ts` calculates duration in `calculateDuration()` function
2. How the PlaceholderEvent component positions and sizes itself
3. How the WeekView or UnifiedDailyPlanner renders the PlaceholderEvent
4. How the `xToDay()` and `yToTime()` helper functions work
5. What happens when `isMultiDay` is true vs false
</research>

<requirements>
1. **Horizontal drag across days**: When the mouse moves horizontally:
   - Calculate which day column the mouse is in
   - Keep the start time (hour + minutes) fixed at the original click position
   - Keep the end time (hour + minutes) tracking the current mouse Y position
   - The placeholder should span from startDate to currentDate, maintaining the actual height

2. **Vertical position tracking**: The placeholder height should always reflect the actual time range:
   - Start time = where the user first double-clicked
   - End time = current mouse Y position (clamped to 0-24 hours)
   - Duration = actual difference, NOT auto-expanded to 24 hours

3. **Multi-day visual rendering**: For events spanning multiple days:
   - The PlaceholderEvent may need to render segments per day
   - Or render a single box that spans across day columns (week view typically uses column-based layout)
   - Consider how the current grid layout handles multi-day placeholders

4. **Edge cases to handle**:
   - Dragging left (backward in days) - should swap start/end dates
   - Dragging to the 24:00 boundary naturally via Y position - should clamp correctly
   - Dragging diagonally (both X and Y changing) - should update both dimensions smoothly
   - Month view vs week view differences (if any)

5. **Do NOT change the behavior when user specifies time in sidebar**: The action sidebar time inputs should continue to work independently of drag position
</requirements>

<implementation>
Focus on:

1. **useEventCreationDrag.ts**:
   - Review the `calculateDuration` function - it may be incorrectly calculating 24-hour durations for multi-day events
   - Check if duration is being set based on day count rather than actual Y positions
   - Ensure the duration only reflects the actual vertical drag distance

2. **PlaceholderEvent.tsx**:
   - Verify the component correctly uses the provided duration and position props
   - Check if there's any 24-hour expansion logic that shouldn't apply during drag

3. **Parent component (UnifiedDailyPlanner or WeekView)**:
   - Ensure drag state is passed correctly to PlaceholderEvent
   - Verify multi-day rendering logic

The fix should:
- Make duration calculation based on actual Y positions, independent of day span
- Keep start time fixed, end time tracking mouse Y
- Render placeholder at correct position across multiple day columns
</implementation>

<constraints>
- Do not modify the action sidebar's ability to set custom times
- Preserve existing single-day drag behavior (vertical only)
- Maintain the 15-minute snap behavior
- Keep the double-click detection logic unchanged
- Preserve the minimum 15-minute duration constraint
</constraints>

<output>
Modify the necessary files to fix the horizontal drag behavior:
- `./src/hooks/useEventCreationDrag.ts` - Fix duration calculation for multi-day drags
- `./src/components/calendar/PlaceholderEvent.tsx` - Update if needed for multi-day rendering
- Any parent components that need adjustment

Test scenarios after implementation:
1. Double-click-drag horizontally across 2-3 day columns - placeholder should NOT expand to 24 hours
2. Double-click-drag diagonally - should track both X (day) and Y (time) correctly
3. Drag to the actual 24:00 boundary via Y movement - should clamp to 24 hours correctly
4. Single-day vertical drag - should work as before (no regression)
</output>

<verification>
Before declaring complete:
1. Run `npm run build` to ensure no TypeScript errors
2. Test in the browser:
   - Week view: double-click-drag horizontally and verify placeholder tracks actual mouse position
   - Verify dragging diagonally (across days + time) works correctly
   - Verify single-column drag still works normally
   - Check that releasing the drag creates the event with correct start/end times
3. Verify the action sidebar still allows manual time selection independent of drag
</verification>

<success_criteria>
- Horizontal drag across days positions placeholder correctly based on actual mouse position
- Placeholder height reflects actual Y-distance, not auto-expanding to 24 hours
- Multi-day events show correct time spans (e.g., 2pm Tuesday to 4pm Wednesday, not 12am to 12am)
- All existing single-day drag functionality preserved
- No TypeScript errors in build
</success_criteria>
