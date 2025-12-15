<objective>
Implement double-click and click-drag event creation across all calendar views (day, week, month) in the time manager. Users should be able to double-click to create a 30-minute placeholder box, or click-drag to create a custom-duration placeholder that spans from mouse down to mouse up position. The placeholder should appear as an unsaved/draft event with distinct styling until the user saves it via the existing sidebar form.
</objective>

<context>
This feature enhances the time manager calendar by allowing intuitive event creation directly on the calendar grid. Currently, events can only be created via the sidebar form. This change enables visual, spatial event creation that many calendar applications support.

Read the project conventions first:
@CLAUDE.md

Key files to examine:
@src/app/time-manager/page.tsx - Main time manager page
@src/components/UnifiedDailyPlanner.tsx - Day view component
@src/components/WeekView.tsx - Week view component (if exists)
@src/components/calendar/ - Calendar-related components
@src/components/sidebar/EventCreationForm.tsx - Existing event creation form
@src/hooks/useEventCreationDrag.ts - May contain existing drag logic
</context>

<requirements>
<functional>
1. **Double-click behavior**:
   - Double-clicking an empty time slot creates a 30-minute placeholder box starting at clicked position
   - Placeholder appears immediately at click location
   - Time slot snaps to nearest 15-minute or 30-minute interval

2. **Click-drag behavior**:
   - Mouse down starts potential drag operation
   - If user drags (moves mouse while holding), placeholder extends from start position to current position
   - Duration updates in real-time as user drags
   - Mouse up finalizes the placeholder size
   - Minimum duration: 15 minutes
   - Placeholder should span from drag start time to drag end time

3. **Placeholder styling**:
   - Visually distinct from saved events (use dashed border, muted colors, or transparency)
   - Still theme-aware (works in both light and dark mode)
   - No text content displayed (empty box)
   - Show time range as a subtle indicator (e.g., "9:00 - 9:30" in small text or tooltip)

4. **Saving behavior**:
   - Clicking on a placeholder selects it and populates the sidebar event creation form with:
     - Start time from placeholder start
     - End time/duration from placeholder end
   - User completes the form and saves
   - On save, placeholder converts to a real event with full styling
   - Provide a way to cancel/dismiss placeholder (Escape key or clicking elsewhere)

5. **View support**:
   - Day view: Full support with time-based positioning
   - Week view: Full support with time-based positioning per day column
   - Month view: Click creates all-day or default-duration event for that date
</functional>

<technical>
- Integrate with existing event creation system (useUnifiedEvents or similar hook)
- Use existing theme CSS variables for placeholder colors
- Handle overlapping with existing events gracefully
- Ensure proper cleanup of placeholder state when navigating between views or dates
</technical>
</requirements>

<implementation>
<approach>
1. Create a new hook `useCalendarPlaceholder` to manage placeholder state:
   - Track placeholder existence, position, and duration
   - Handle mouse events for double-click and drag
   - Provide methods to create, update, resize, and dismiss placeholder

2. Create a `PlaceholderEvent` component for rendering the visual placeholder:
   - Accept start time, duration, and view type
   - Render with draft/placeholder styling
   - Handle click to select for editing

3. Integrate placeholder logic into each calendar view:
   - Add mouse event handlers to time slot containers
   - Render placeholder component when active
   - Connect to sidebar form population

4. Update sidebar form to accept pre-populated values from placeholder selection
</approach>

<styling_guidance>
For placeholder styling, use theme-aware CSS that distinguishes from saved events:
```css
/* Example approach - adapt to existing theme system */
.event-placeholder {
  background-color: var(--placeholder-bg, rgba(var(--primary-rgb), 0.15));
  border: 2px dashed var(--placeholder-border, var(--primary-color));
  opacity: 0.7;
}
```
</styling_guidance>

<avoid>
- Don't create events in database until user explicitly saves (placeholder is client-side only)
- Don't block interaction with existing events while placeholder is active
- Don't add new dependencies - use existing state management patterns
- Don't over-engineer - keep the implementation focused on the core interaction
</avoid>
</implementation>

<output>
Create or modify files as needed:
- `./src/hooks/useCalendarPlaceholder.ts` - New hook for placeholder state management
- `./src/components/calendar/PlaceholderEvent.tsx` - New placeholder rendering component
- Modify existing view components to integrate placeholder functionality
- Update sidebar form to accept placeholder data

Ensure all changes follow existing code patterns and TypeScript conventions in the codebase.
</output>

<verification>
Before completing, verify:
1. Double-click in day view creates 30-minute placeholder at correct time
2. Click-drag in day view creates variable-duration placeholder
3. Week view has same functionality per day column
4. Month view creates placeholder for selected date
5. Clicking placeholder populates sidebar form with correct times
6. Saving via sidebar converts placeholder to real event
7. Escape key or clicking elsewhere dismisses placeholder
8. Placeholder styling is visually distinct but theme-consistent
9. Works correctly in both light and dark themes
10. No TypeScript errors or lint warnings
</verification>

<success_criteria>
- Users can double-click any empty time slot to create a 30-minute placeholder
- Users can click-drag to create custom-duration placeholders
- Placeholder boxes are visually distinct (dashed border, muted colors) from saved events
- Placeholders integrate with existing sidebar event creation form
- Feature works across day, week, and month views
- All interactions feel responsive and intuitive
</success_criteria>
