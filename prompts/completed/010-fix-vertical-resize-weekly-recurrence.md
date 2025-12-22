<objective>
Debug and fix the vertical resize weekly recurrence feature in the month view calendar.

When a user creates a multi-day placeholder event (e.g., Mon-Thu) and then vertically resizes it using the up/down resize handles to repeat the event across multiple weeks, there appears to be an issue upon releasing the mouse. The vertical resize should create a weekly recurring event pattern.
</objective>

<context>
This is the Becky CRM time-manager calendar component. The feature allows users to:
1. Double-click drag in month view to create a multi-day placeholder spanning Mon-Thu
2. Use vertical resize handles (top/bottom) to extend the event across multiple week rows
3. This should set up a weekly recurrence pattern, not extend the event end date

Key files to examine:
- `src/components/ScheduleCalendar.tsx` - Contains handlePlaceholderResizeStart and vertical resize logic (lines ~991-1199)
- `src/components/sidebar/EventCreationForm.tsx` - Receives weeklyRecurrenceEnd and weeklyRecurrenceCount props
- `src/app/time-manager/page.tsx` - Parent component handling placeholder state
</context>

<investigation_steps>
1. **Trace the data flow** after vertical resize mouse up:
   - `handleMouseUp` in ScheduleCalendar.tsx calls `onPlaceholderChange` with weeklyRecurrenceEnd
   - Verify page.tsx receives and processes this correctly
   - Verify EventCreationForm receives the props

2. **Check for state sync issues**:
   - The console shows EventCreationForm renders 4 times with the same props
   - Look for potential state update loops or race conditions
   - Check if the form properly transitions from "daily" to "weekly" recurrence mode

3. **Verify the visual feedback**:
   - After releasing the resize handle, do the preview rows disappear correctly?
   - Does the placeholder maintain its visual appearance?
   - Is the form's recurrence UI updated to show weekly pattern?

4. **Test the actual event creation**:
   - When submitting the form after vertical resize, does it create the correct recurring events?
   - Check the API call in EventCreationForm.tsx for proper recurrence data
</investigation_steps>

<potential_issues>
Based on the console logs, investigate these specific areas:

1. **Multiple renders**: EventCreationForm.tsx:129 shows 4 consecutive renders with the same data
   - Check useEffect dependencies in EventCreationForm
   - Look for unnecessary state updates

2. **Recurrence mode switching**: The logs show the form switches to "weekly" mode correctly
   - EventCreationForm.tsx:247 shows "Setting form to recurring mode (weekly) for vertical resize - weeks: 3"
   - Verify this mode persists and is used when submitting

3. **Cleanup after resize**: After `setPlaceholderInteraction(null)` and `setPlaceholderVerticalPreview(null)`:
   - Ensure preview rows are properly cleaned up
   - Ensure the main placeholder styling remains correct
</potential_issues>

<requirements>
1. **Identify the bug**: Thoroughly analyze the console logs and code to identify what goes wrong
2. **Fix the issue**: Implement a fix that ensures:
   - Vertical resize correctly sets up weekly recurrence data
   - The EventCreationForm displays the correct recurrence settings
   - Submitting the form creates the correct weekly recurring events
3. **Clean up debug logging**: Remove excessive console.log statements after fixing
4. **Verify the fix**: Test the complete flow from vertical resize to event creation
</requirements>

<verification>
After implementing fixes:
1. Create a multi-day placeholder (Mon-Thu) in month view
2. Grab the bottom resize handle and drag down 2 weeks
3. Verify the form shows "Weekly" recurrence with correct end date
4. Submit the form and verify 3 events are created (one per week)
5. Ensure no console errors or excessive re-renders
</verification>

<success_criteria>
- Vertical resize properly configures weekly recurrence in the form
- Form submits and creates correct weekly recurring events
- No React warnings or excessive re-renders
- Preview rows appear during drag and disappear on release
- Main placeholder remains styled correctly throughout
</success_criteria>
