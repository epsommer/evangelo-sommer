<objective>
Refactor the EventDetailsModal functionality into the ActionSidebar, allowing users to view event details inline in the sidebar instead of a popup modal.

When clicking an existing event in the calendar, the ActionSidebar should display the event's full details with options to edit or delete.
</objective>

<context>
This is the Becky CRM/Time Manager application built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

Key files to examine:
- `src/components/EventDetailsModal.tsx` - Current modal showing event details (to be refactored)
- `src/components/ActionSidebar.tsx` - Sidebar that will host the event details view
- `src/components/WeekView.tsx` - Handles event clicks, currently opens EventDetailsModal
- `src/components/calendar/CalendarEvent.tsx` - Individual event component with click handler

Current behavior:
- Clicking an event in WeekView calls `handleShowEventDetails(event)`
- This opens `EventDetailsModal` as a centered popup
- Modal shows: title, type badge, priority badge, description, schedule, location, client, participants, notes, notifications, recurrence info
- Footer has Edit, Delete, and Close buttons

Target behavior:
- Clicking an event should show details in the ActionSidebar
- Same information displayed inline in sidebar
- Same Edit/Delete actions available
- No modal overlay - keeps calendar visible
</context>

<requirements>
1. Add event details mode to ActionSidebar
   - New prop: `selectedEvent?: UnifiedEvent`
   - New prop: `onEventEdit?: (event: UnifiedEvent) => void`
   - New prop: `onEventDelete?: (eventId: string) => void`
   - When `selectedEvent` is set, show event details view instead of default panels

2. Create EventDetailsPanel component for sidebar
   - Extract display logic from EventDetailsModal
   - Adapt layout for sidebar width (narrower than modal)
   - Use collapsible sections for dense information
   - Include all current details: schedule, location, client, participants, notes, etc.

3. Update WeekView event click handling
   - Instead of opening modal, call a prop to set sidebar event
   - Remove or deprecate EventDetailsModal usage in WeekView
   - Pass edit/delete handlers through to sidebar

4. Handle sidebar mode transitions
   - If event creation mode is active and user clicks existing event → switch to details mode
   - If event details mode is active and user double-clicks empty slot → switch to creation mode
   - Exit button to return to default overview mode

5. Styling considerations
   - Use same neomorphic card styling
   - Scrollable content area
   - Fixed header with event title and close button
   - Fixed footer with action buttons (Edit, Delete)
   - Responsive to sidebar width
</requirements>

<implementation>
New sidebar modes (extend existing):
```typescript
type SidebarMode = 'overview' | 'analytics' | 'event-creation' | 'event-details'
```

EventDetailsPanel structure:
- Header: Title, close button, type/priority badges
- Scrollable content:
  - Description (if present)
  - Schedule section (start, end, duration, all-day, multi-day)
  - Location section (if present)
  - Client section (if present)
  - Participants section (if present)
  - Notes section (if present)
  - Notifications section (if present)
  - Recurrence section (if recurring)
- Footer: Edit button, Delete button

Preserve functionality:
- Edit button should open EventCreationModal with `editingEvent` set
- Delete button should call delete handler and return to overview
- All existing styling and formatting should be maintained

Why inline sidebar: This keeps the calendar always visible, allowing users to reference their schedule while viewing event details. It's also more efficient than modal overlays that block interaction.
</implementation>

<output>
Create:
- `src/components/sidebar/EventDetailsPanel.tsx` - Event details display for sidebar

Modify:
- `src/components/ActionSidebar.tsx` - Add event details mode and rendering
- `src/components/WeekView.tsx` - Change event click to set sidebar state instead of opening modal

Optionally deprecate (can keep for now):
- `src/components/EventDetailsModal.tsx` - May still be used elsewhere
</output>

<verification>
Before declaring complete:
1. Click on an existing event in the calendar
2. Verify ActionSidebar switches to show event details
3. Verify all event information is displayed correctly
4. Click Edit button and verify edit modal opens with event data
5. Click Delete button and verify event is deleted
6. Click close/back button and verify sidebar returns to overview
7. Verify calendar remains visible and interactive while viewing details
8. Test mode transitions (details → creation, creation → details)
</verification>

<success_criteria>
- Clicking an event shows its details in the sidebar (not a modal)
- All event information is displayed: title, type, priority, schedule, location, client, participants, notes, notifications, recurrence
- Edit and Delete actions work correctly
- Sidebar can be closed to return to overview
- Calendar remains visible during event details view
- Smooth transitions between sidebar modes
</success_criteria>
