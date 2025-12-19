<objective>
Convert the batch add modal (MultiEventCreationModal) into an inline sidebar panel that fits within the ActionSidebar, following the same pattern as EventCreationForm and EventDetailsPanel.

The batch add functionality currently opens as a full modal overlay. It should instead be an inline panel within the ActionSidebar that users can access from a button/tab, providing a more integrated experience within the time manager workflow.
</objective>

<context>
Project: Next.js 15 calendar/time-manager application with React 19
Tech Stack: TypeScript, Tailwind CSS, Prisma, date-fns

Current Architecture:
- ActionSidebar.tsx manages sidebar state and conditionally renders panels
- EventCreationForm is an inline sidebar panel for creating single events
- EventDetailsPanel is an inline sidebar panel for viewing event details
- MultiEventCreationModal is a full-screen modal for batch event creation

Target Architecture:
- BatchAddPanel should be a new inline sidebar component
- ActionSidebar should have a new mode/state for batch add view
- Similar UX flow to EventCreationForm but for multiple events

@src/components/ActionSidebar.tsx - Main sidebar orchestrator with conditional rendering
@src/components/MultiEventCreationModal.tsx - Current batch add modal to convert
@src/components/sidebar/EventCreationForm.tsx - Reference for inline panel pattern
@src/components/sidebar/EventDetailsPanel.tsx - Reference for inline panel pattern
</context>

<requirements>
1. **Create BatchAddPanel Component**
   - New file: src/components/sidebar/BatchAddPanel.tsx
   - Extract batch add functionality from MultiEventCreationModal
   - Adapt layout for sidebar width (~350-400px) instead of modal width
   - Keep all features: add/remove events, duplicate, quick paste, validation
   - Use collapsible sections to manage vertical space
   - Include header with close button and clear action

2. **Update ActionSidebar State Management**
   - Add new mode/state: `isBatchAddMode` or similar
   - Add conditional rendering for BatchAddPanel
   - Ensure mutual exclusivity with other modes (event details, event creation)
   - Update button to trigger batch add mode instead of opening modal

3. **Adapt UI for Sidebar Constraints**
   - Vertical scrolling for the event list
   - Compact event entry cards that expand on interaction
   - Stack form fields vertically (no multi-column layouts)
   - Quick paste area as collapsible section
   - Floating/sticky save button at bottom
   - Estimated time display in compact format

4. **Maintain Feature Parity**
   - Event type selection per event
   - Title, date, time, duration fields
   - Priority selection
   - Add more events button
   - Remove event button
   - Duplicate event functionality
   - Quick paste bulk entry
   - Validation and error display
   - Save all events action

5. **Handle Transitions**
   - Clear transition from batch add mode back to overview
   - Option to switch to single event creation for individual editing
   - Cancel action to discard all pending events
</requirements>

<implementation>
Step 1: Create BatchAddPanel component
- Create new file: src/components/sidebar/BatchAddPanel.tsx
- Copy core logic from MultiEventCreationModal
- Restructure layout for sidebar width:
  - Header with title, event count, close button
  - Scrollable event list area
  - Each event as a compact, expandable card
  - Footer with cancel/save buttons and total time

Step 2: Design compact event card layout
- Collapsed view: event number, title (truncated), time, delete button
- Expanded view: full form fields stacked vertically
- Click to expand/collapse individual events
- Only one event expanded at a time (accordion pattern)

Step 3: Implement quick paste as collapsible section
- Toggle button "Quick Paste" to show/hide
- Text area with parsing instructions
- Parse button to convert text to events
- Collapsed by default

Step 4: Update ActionSidebar
- Import BatchAddPanel component
- Add isBatchAddMode state
- Add setBatchAddMode function
- Update render logic with batch add condition:
  ```tsx
  if (isBatchAddMode) {
    return <BatchAddPanel onClose={() => setBatchAddMode(false)} ... />
  }
  ```
- Update existing batch add button to use setBatchAddMode(true)
- Remove MultiEventCreationModal reference from ActionSidebar

Step 5: Add sticky footer for actions
- Position save/cancel buttons at bottom of panel
- Display total estimated time
- Disable save if no events or validation errors

Step 6: Style consistently with existing panels
- Match EventCreationForm and EventDetailsPanel styling
- Use same border, padding, background patterns
- Consistent button styles (neo-button classes)
- Respect dark/light mode theming
</implementation>

<output>
Create/modify these files:
- `./src/components/sidebar/BatchAddPanel.tsx` - New inline batch add panel
- `./src/components/ActionSidebar.tsx` - Add batch add mode state and rendering
</output>

<verification>
Before completing, verify:
1. BatchAddPanel renders correctly within sidebar width constraints
2. All batch add features work: add, remove, duplicate, quick paste
3. Mode switching works: overview -> batch add -> overview
4. Events save successfully with all required data
5. No TypeScript errors: `npm run type-check`
6. No ESLint errors: `npm run lint`
7. UI is scrollable and usable with 5+ events
8. Styling matches existing sidebar panels
</verification>

<success_criteria>
- Batch add functionality fully integrated into sidebar
- No modal overlay used for batch add
- All original features preserved and functional
- Compact, usable interface within sidebar width
- Consistent styling with other sidebar panels
- Smooth mode transitions without UI glitches
- MultiEventCreationModal can be removed or deprecated
</success_criteria>
