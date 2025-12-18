<objective>
Fix calendar placeholder styling consistency and state management so that:
1. Single-day placeholders (created via double-click) match the multi-day placeholder styling (dashed border container)
2. Text color in true-dark mode has sufficient contrast against the dark grey background
3. Single-day placeholders properly dismiss when the user performs other actions

This matters because the current UX is inconsistent and confusing - placeholders appear stuck and don't respond to expected dismissal triggers.
</objective>

<context>
This is a Next.js calendar application with a month view. Users can:
- Double-click on a day cell to create a single-day event placeholder
- Double-click and drag across multiple days to create a multi-day event placeholder
- Drag existing events to reschedule them
- Resize events
- Click on events to select them

Key files to examine:
- `src/components/ScheduleCalendar.tsx` - Main calendar component, handles placeholder state
- `src/components/DragDropContext.tsx` - Manages drag state across calendar
- `src/app/globals.css` - Theme and styling variables

The application uses Tailwind CSS with custom CSS variables for theming (light/dark/true-dark modes).
</context>

<console_log_analysis>
The following console log excerpt reveals the bug - single-day placeholders are created but never cleared:

```
ScheduleCalendar.tsx:707 📌 Creating single-day placeholder for: 2025-12-02
...
DragDropContext.tsx:98 🎯 DragDropContext.startDrag called for: test event from slot: Object
// NOTE: No placeholder clear happens here!
...
DragDropContext.tsx:114 🎯 DragDropContext.endDrag called
ScheduleCalendar.tsx:449 ✅ Event rescheduled successfully
// NOTE: Placeholder still persists after successful reschedule
```

The `startDrag` call should trigger placeholder dismissal, but it doesn't.
</console_log_analysis>

<requirements>

## Part 1: Styling Consistency

1. **Analyze multi-day placeholder styling** - Find where the dashed border container style is defined for multi-day placeholders
2. **Apply same styling to single-day placeholders** - Ensure double-click single-day events render with identical dashed border styling
3. **Fix text color contrast in true-dark mode** - Identify which CSS variable or class controls text color in the placeholder container for month view, and choose a more legible color (aim for WCAG AA contrast ratio minimum 4.5:1 against the dark grey background)

## Part 2: State Management Fix

Implement proper placeholder dismissal. The single-day placeholder should disappear when:
1. User clicks on an existing event/task (selecting it)
2. User starts dragging an existing event
3. User starts resizing an existing event
4. User single-clicks on an empty cell (not double-click)
5. User clicks outside the calendar canvas
6. User refreshes the page (state should not persist across page loads)

## Implementation Approach

1. **Identify placeholder state location** - Find where `multiDayPlaceholder` or similar state is managed in `ScheduleCalendar.tsx`
2. **Create a `clearPlaceholder` function** if one doesn't exist
3. **Hook dismissal triggers** - Add calls to clear placeholder in:
   - Event click handlers
   - `DragDropContext.startDrag` (or ScheduleCalendar's drag start handler)
   - Resize start handlers
   - Empty cell single-click handlers
   - Document-level click handler for outside clicks (with proper cleanup)
4. **Verify state doesn't persist** - Ensure placeholder is stored in React state only (not localStorage)

</requirements>

<implementation>
Thoroughly analyze the existing code before making changes. Consider:
- Where is the multi-day placeholder rendered and styled?
- Where is the single-day placeholder rendered (or should they share the same renderer)?
- What CSS classes/variables control the dashed border and text color?
- What event handlers need to call the placeholder clear function?

Do NOT over-engineer. Focus on:
- Adding dismissal calls to existing handlers
- Unifying the styling between single and multi-day placeholders
- Fixing the specific text color contrast issue

Avoid:
- Creating new state management systems
- Refactoring unrelated code
- Adding features beyond the scope
</implementation>

<output>
Modify the following files as needed:
- `./src/components/ScheduleCalendar.tsx` - Add placeholder dismissal logic
- `./src/components/DragDropContext.tsx` - Add placeholder clear callback if needed
- `./src/app/globals.css` - Fix text color contrast for true-dark mode
- Any other component files that render placeholders or handle click/drag events
</output>

<verification>
Before declaring complete, verify your work:

1. **Styling verification:**
   - Double-click a single day - placeholder should show dashed border
   - Double-click and drag across days - placeholder should show identical dashed border styling
   - Switch to true-dark mode - placeholder text should be clearly readable

2. **Dismissal verification (test each scenario):**
   - Create single-day placeholder via double-click
   - Click an existing event → placeholder should disappear
   - Create placeholder, then drag an event → placeholder should disappear
   - Create placeholder, then resize an event → placeholder should disappear
   - Create placeholder, then single-click empty cell → placeholder should disappear
   - Create placeholder, then click outside calendar → placeholder should disappear
   - Create placeholder, then refresh page → placeholder should not reappear

3. **No regressions:**
   - Multi-day placeholder creation still works
   - Event creation form still opens after placeholder creation
   - Drag and drop still functions correctly
</verification>

<success_criteria>
- Single-day and multi-day placeholders have visually identical dashed border styling
- Placeholder text is legible in all theme modes including true-dark (contrast ratio ≥ 4.5:1)
- Single-day placeholders dismiss on all 6 trigger scenarios listed above
- No console errors introduced
- Existing calendar functionality preserved
</success_criteria>
