<objective>
Implement double-click on empty time slot cells in the calendar (WeekView) to open the event creation form in the ActionSidebar instead of the modal.

When a user double-clicks on an empty time slot cell, the ActionSidebar should transition to show the event creation form with the clicked time slot's date and time pre-filled.
</objective>

<context>
This is the Becky CRM/Time Manager application built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

Key files to examine:
- `src/components/WeekView.tsx` - Main calendar week view with time slots and event handling
- `src/components/ActionSidebar.tsx` - Right sidebar that already has `isEventCreationMode` and `initialEventTime` props
- `src/components/DropZone.tsx` - The clickable time slot component
- `src/components/EventCreationModal.tsx` - Current modal-based event creation form (reference for form fields)

Current behavior:
- WeekView has `handleTimeSlotClick` that opens `EventCreationModal` on single click
- ActionSidebar already accepts props for event creation mode but shows a placeholder message
- DropZone passes click events up to WeekView

Target behavior:
- Double-click on empty time slot should:
  1. Set the ActionSidebar into event creation mode
  2. Pre-fill the date/time from the clicked slot
  3. Show an inline event creation form (not modal)
</context>

<requirements>
1. Add double-click detection to DropZone component
   - Differentiate between single click (existing behavior) and double-click
   - Pass double-click events up to parent with date/hour information

2. Update WeekView to handle double-click events
   - Add `onTimeSlotDoubleClick` handler
   - Pass callback to parent component that sets sidebar to event creation mode

3. Update ActionSidebar event creation mode
   - Extract form fields from EventCreationModal into a reusable component or inline form
   - Pre-fill date and start time from the double-clicked slot
   - Include all required fields: title, description, date, start time, end time, priority, client
   - Handle form submission through the existing `onEventCreate` prop
   - Show cancel button to exit creation mode

4. Wire up the parent component (likely UnifiedDailyPlanner or CalendarLayout)
   - Pass the double-click handler down to WeekView
   - Control ActionSidebar's `isEventCreationMode` and `initialEventTime` props
</requirements>

<implementation>
Single click should continue to work as before (if any existing behavior).
Double-click should:
1. Calculate the Date object and time string from the clicked slot
2. Call a new prop like `onTimeSlotDoubleClick(date: Date, hour: number)`
3. Parent component sets state to enable event creation mode in sidebar

For the sidebar form:
- Use the same neomorphic styling as EventCreationModal
- Include form validation
- Support keyboard shortcuts (Ctrl+Enter to save, Escape to cancel)

Why double-click: This allows single-click to potentially show a preview or selection while double-click commits to creating an event, which is a common UX pattern in calendar applications.
</implementation>

<output>
Modify these files:
- `src/components/DropZone.tsx` - Add onDoubleClick handler
- `src/components/WeekView.tsx` - Add double-click handling and prop passing
- `src/components/ActionSidebar.tsx` - Replace placeholder with actual event creation form

Create if needed:
- `src/components/sidebar/EventCreationForm.tsx` - Extracted form component (optional, can be inline)
</output>

<verification>
Before declaring complete:
1. Double-click on an empty time slot in WeekView
2. Verify ActionSidebar switches to event creation mode
3. Verify the date and time are pre-filled correctly
4. Fill in required fields and submit
5. Verify event is created and appears in the calendar
6. Verify cancel button returns sidebar to normal view
7. Verify single-click behavior is unchanged
</verification>

<success_criteria>
- Double-clicking an empty time slot opens the event creation form in the sidebar
- The form is pre-filled with the correct date and time
- Events can be created successfully from the sidebar form
- User can cancel and return to normal sidebar view
- Existing single-click behavior is preserved
</success_criteria>
