<objective>
Add the ability to delete scheduled events from the event details modal in the action sidebar.

When a user clicks on an event in the calendar, the event details modal opens in the ActionSidebar. Currently there is no way to delete events - this feature needs to be added with a confirmation dialog to prevent accidental deletions.
</objective>

<context>
This is a Next.js calendar/time-manager application. The event details are displayed in a modal within the ActionSidebar component when a user single-clicks on a calendar event.

Key files to examine:
- `src/components/ActionSidebar.tsx` - Contains the sidebar and event details modal
- `src/app/api/events/route.ts` - API routes for event CRUD operations (check for existing DELETE handler)
- `src/hooks/useUnifiedEvents.ts` - Hook managing event state and operations
- `src/types/` - Event type definitions
</context>

<requirements>
1. Add a "Delete Event" button to the event details modal in ActionSidebar
   - Position it appropriately (bottom of modal or in a footer area)
   - Use red/destructive styling to indicate it's a dangerous action
   - Use a trash icon from lucide-react to match existing icon usage

2. Implement a confirmation dialog before deletion
   - Show event title in the confirmation message
   - Provide "Cancel" and "Delete" buttons
   - "Delete" button should be styled as destructive (red)

3. Handle the delete operation
   - Call the DELETE endpoint at `/api/events?id={eventId}`
   - Show loading state while deletion is in progress
   - Remove the event from local state after successful deletion
   - Close the event details modal after deletion
   - Handle errors gracefully with user feedback

4. Verify or implement the DELETE API endpoint
   - Check if `/api/events` route.ts has a DELETE handler
   - If not, implement one that removes the event from the database
   - Ensure it also removes from any external calendar syncs if applicable
</requirements>

<implementation>
UI Pattern:
- Use existing modal/dialog components if available in the codebase
- Match the existing design system (check for confirmation modals elsewhere)
- The delete button should be clearly separated from edit/close actions

Delete flow:
1. User clicks "Delete Event" button
2. Confirmation modal appears: "Are you sure you want to delete '{eventTitle}'?"
3. User clicks "Delete" to confirm or "Cancel" to abort
4. On confirm: Show loading state, call API, update UI, close modals
5. On error: Show error message, keep modals open for retry

API considerations:
- The DELETE handler should check for authenticated user
- Should only allow deletion of user's own events
- Should handle cascade deletion if event has related records
</implementation>

<output>
Modify or create the following files:
- `./src/components/ActionSidebar.tsx` - Add delete button and confirmation modal
- `./src/app/api/events/route.ts` - Add or verify DELETE handler
- `./src/hooks/useUnifiedEvents.ts` - Add deleteEvent function if not present
</output>

<verification>
Before completing:
1. Test clicking the delete button opens confirmation dialog
2. Test canceling the confirmation returns to event details without changes
3. Test confirming deletion removes the event and closes the modal
4. Test that deleted events no longer appear in the calendar
5. Test error handling by simulating a failed API call
6. Ensure the feature works for events on different days
</verification>

<success_criteria>
- Delete button is visible and appropriately styled in event details modal
- Confirmation dialog prevents accidental deletions
- Successful deletion removes event from calendar and database
- User receives feedback on success or failure
- Modal closes appropriately after deletion
- No TypeScript errors introduced
</success_criteria>
