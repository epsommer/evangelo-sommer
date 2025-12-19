<objective>
Relocate the "Batch Add" and "Add Event" buttons from the UnifiedDailyPlanner day view header to the ActionSidebar. Replace the "Mission Objectives" panel with a functional "Batch Add" feature that creates actual calendar events. Optionally place the "Add Event" button near the view dropdown in TimeManagerNavigation if that proves to be a better UX fit.

This consolidates event creation controls into the sidebar for a cleaner, more consistent UI across all calendar views.
</objective>

<context>
The time manager application has these key components:
- `src/components/UnifiedDailyPlanner.tsx` - Day view with "Batch Add" and "Add Event" buttons in the header (lines 770-789)
- `src/components/ActionSidebar.tsx` - Right sidebar with collapsible panels: Calendar, Mission Objectives, Upcoming Events
- `src/components/TimeManagerNavigation.tsx` - Top navigation bar with view dropdown (Day/Week/Month)
- `src/components/MultiEventCreationModal.tsx` - Modal for batch creating multiple events

Current button implementations:
1. **Batch Add** button opens `MultiEventCreationModal` for creating multiple events at once
2. **Add Event** button opens `EventCreationModal` for single event creation

The "Mission Objectives" panel in ActionSidebar uses localStorage and is date-specific but doesn't integrate with the calendar event system. The goal is to replace it with "Batch Add" which creates real calendar events.
</context>

<research>
Before implementing, examine:
1. How `MultiEventCreationModal` works and what props it needs
2. How the sidebar currently handles event creation mode (`isEventCreationMode`)
3. The data flow from sidebar to calendar for event creation
4. Whether `TimeManagerNavigation` can accept additional action buttons
</research>

<requirements>
1. **Remove buttons from UnifiedDailyPlanner header**
   - Remove the "Batch Add" and "Add Event" buttons from lines 770-789
   - Keep other header elements (date display, view mode toggle, search, filter)

2. **Replace Mission Objectives panel with Batch Add in ActionSidebar**
   - Remove the MissionObjective interface and related state (`objectives`, `quickEntryText`)
   - Remove `renderObjectives()` function and its localStorage logic
   - Create a new "Batch Add" panel that opens the MultiEventCreationModal
   - Include a quick-add input field that uses the same text parsing logic (priority, duration, category)
   - Events should be created through the existing `onEventCreate` callback

3. **Add Event button placement decision**
   - Option A: Place in sidebar header area (next to panel toggles)
   - Option B: Place in TimeManagerNavigation (next to view dropdown)
   - Choose based on which provides better UX consistency

4. **Wire up the batch add functionality**
   - Import and use `MultiEventCreationModal` in ActionSidebar
   - Pass through the selected date and onEventCreate callback
   - Ensure batch-created events appear in the calendar immediately

5. **Update props flow**
   - ActionSidebar may need additional props: `onBatchEventCreate?: (events: UnifiedEvent[]) => Promise<void>`
   - Ensure all calendar views can trigger sidebar batch add
</requirements>

<implementation>
Step-by-step approach:

1. First, modify ActionSidebar.tsx:
   - Remove MissionObjective-related code
   - Add state for MultiEventCreationModal visibility
   - Import and render MultiEventCreationModal
   - Create a "Quick Add" input that parses text into events
   - Replace the "Mission Objectives" panel with "Batch Add" panel

2. Then, modify UnifiedDailyPlanner.tsx:
   - Remove the "Batch Add" and "Add Event" buttons
   - Keep the showMultiEventModal and showEventModal state if still needed locally
   - Or delegate fully to parent/sidebar

3. Update time-manager page.tsx if needed:
   - Pass any new callbacks to CalendarLayout/ActionSidebar
   - Handle batch event creation

4. Consider adding "Add Event" to TimeManagerNavigation.tsx:
   - This would make event creation accessible from all views
   - Would need to callback to parent to trigger event creation mode

Preserve the existing UX patterns:
- Neo-morphic styling
- Collapsible panel behavior
- Dark/light mode support
</implementation>

<constraints>
- Do NOT break existing event creation flow via double-click on calendar
- Do NOT remove the sidebar event creation form (EventCreationForm component)
- Maintain responsive behavior (hidden text on small screens)
- Keep consistent styling with existing neo-morphic design system
- Events created via batch add must immediately appear in the calendar
</constraints>

<output>
Modify these files:
- `./src/components/ActionSidebar.tsx` - Replace Mission Objectives with Batch Add
- `./src/components/UnifiedDailyPlanner.tsx` - Remove Batch Add and Add Event buttons
- `./src/components/TimeManagerNavigation.tsx` - Optionally add Add Event button (if decided)
- `./src/app/time-manager/page.tsx` - Update props if needed

Do NOT create new files unless absolutely necessary for this feature.
</output>

<verification>
After implementation:
1. Navigate to Time Manager in browser
2. Verify "Batch Add" and "Add Event" buttons are no longer in day view header
3. Verify "Batch Add" panel appears in sidebar (replacing Mission Objectives)
4. Create a batch of events and confirm they appear in the calendar
5. Test single "Add Event" functionality from its new location
6. Verify event creation via double-click on calendar still works
7. Test across Day, Week, and Month views
8. Check both light and dark themes for styling consistency
</verification>

<success_criteria>
- Mission Objectives panel completely removed from sidebar
- Batch Add functionality accessible from sidebar in all calendar views
- Events created via Batch Add appear immediately in calendar
- Add Event button accessible (either in sidebar or navigation)
- No regression in existing event creation flows
- Consistent styling across all themes
</success_criteria>
