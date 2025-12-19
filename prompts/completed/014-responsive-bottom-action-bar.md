<objective>
Implement a responsive bottom action bar that replaces the sidebar on mobile and narrow displays. The current ActionSidebar (visible on desktop/landscape) must transform into an expandable bottom action bar on mobile, portrait tablets, and narrow viewports. This provides consistent access to calendar actions across all device sizes.

Read CLAUDE.md for project conventions before implementation.
</objective>

<context>
The time manager calendar application currently has a dynamic action sidebar that:
- Is completely hidden below the `lg` (1024px) breakpoint via `hidden lg:block`
- Supports multiple modes: overview (mini calendar, upcoming events), event creation, event details, batch add
- Synchronizes with calendar views via props: `isEventCreationMode`, `selectedEvent`, `onFormChange`, etc.
- Lives in `CalendarLayout.tsx` which wraps all calendar views

Key files to examine:
@src/components/CalendarLayout.tsx - Master layout wrapper with responsive sidebar container
@src/components/ActionSidebar.tsx - Full sidebar implementation with modes
@src/components/sidebar/EventDetailsPanel.tsx - Event details display
@src/components/sidebar/EventCreationForm.tsx - Event creation form
@src/components/sidebar/BatchAddPanel.tsx - Batch event creation
@src/app/time-manager/page.tsx - Main calendar page orchestrating views

Device breakpoints:
- Desktop (lg+, 1024px+): Dynamic sidebar on the side (current behavior - KEEP)
- Tablet landscape (md-lg, 768-1023px): Dynamic sidebar on the side (current behavior - KEEP)
- Tablet portrait/narrow (sm-md, 640-767px): Bottom action bar (NEW)
- Mobile (<640px): Bottom action bar (NEW)
</context>

<requirements>
<functional>
1. Create a new `BottomActionBar.tsx` component that provides the same functionality as ActionSidebar for narrow/mobile displays
2. The bottom action bar should:
   - Be collapsible/expandable via a pull tab at the top
   - Support resizing by dragging the pull tab (like a drawer)
   - Have smooth CSS transitions for expand/collapse
   - Persist height state during the session (not across page reloads)
   - Default to a collapsed "quick actions" state showing key action buttons
   - Expand to show full content (event details, creation form, etc.)

3. Bottom action bar modes (matching sidebar):
   - Quick actions (collapsed): Event create button, batch add button, conflict indicator
   - Event creation mode: Show EventCreationForm when creating new events
   - Event details mode: Show EventDetailsPanel when an event is selected
   - Batch add mode: Show BatchAddPanel for batch event creation

4. Feature exclusion for narrow view:
   - Do NOT include the mini calendar in the bottom action bar
   - Do NOT include "create calendar" functionality
   - Keep it focused on event actions only

5. The bottom action bar must work seamlessly with:
   - Day view (UnifiedDailyPlanner)
   - Week view (WeekView)
   - Month view (ScheduleCalendar)
</functional>

<responsive_breakpoints>
Display sidebar on side when:
- Screen width >= 768px (md breakpoint and above)
- OR device is in landscape orientation with width >= 640px

Display bottom action bar when:
- Screen width < 768px in portrait orientation
- OR screen width < 640px in any orientation
- Use CSS media queries and/or a useMediaQuery hook for clean detection
</responsive_breakpoints>

<ui_behavior>
Pull tab behavior:
- Visible at the top of the bottom action bar
- Shows a drag handle indicator (horizontal line or chevron)
- Dragging up expands the bar
- Dragging down collapses it
- Tapping toggles between collapsed/expanded states
- Add resistance at min/max heights

Height constraints:
- Minimum collapsed height: ~60-80px (showing action buttons)
- Maximum expanded height: 70% of viewport height
- Smooth spring animation on snap to collapsed/expanded positions

Touch interactions:
- Support touch drag on the pull tab
- Support swipe up/down gestures on the pull tab area
- Do NOT interfere with calendar scroll/drag interactions
</ui_behavior>
</requirements>

<implementation>
<step_1>
Create the BottomActionBar component:
- Location: `./src/components/BottomActionBar.tsx`
- Accept the same props as ActionSidebar for mode switching
- Implement pull-to-resize with touch and mouse support
- Use framer-motion for smooth animations
</step_1>

<step_2>
Update CalendarLayout.tsx:
- Add responsive logic to switch between sidebar and bottom bar
- Use CSS `hidden`/`block` classes with appropriate breakpoints
- Ensure both components receive the same props for consistent behavior
</step_2>

<step_3>
Create a useResizableDrawer hook (optional but recommended):
- Location: `./src/hooks/useResizableDrawer.ts`
- Encapsulates drag/touch handling logic
- Returns height, isDragging, handlers for the pull tab
- Handles snap-to-position logic
</step_3>

<step_4>
Style the bottom action bar:
- Match the existing design system (border colors, backgrounds, typography)
- Ensure it works with all theme variants (light, dark, true-dark, mocha, etc.)
- Add appropriate z-index to stay above calendar content
- Add subtle shadow when expanded to indicate elevation
</step_4>

<patterns_to_follow>
- Use the existing `cn()` utility for conditional class merging
- Follow the component patterns in existing sidebar components
- Use Tailwind CSS classes matching the project's style
- Use framer-motion since it's already a project dependency
- Reuse EventCreationForm, EventDetailsPanel, BatchAddPanel without modification
</patterns_to_follow>

<avoid>
- Do NOT duplicate form logic - reuse existing sidebar components
- Do NOT create separate state management - use same props as sidebar
- Do NOT break existing desktop sidebar behavior
- Do NOT add new dependencies - use existing framer-motion
- Do NOT include mini calendar in bottom bar - specifically excluded
</avoid>
</implementation>

<output>
Create/modify these files:

1. `./src/components/BottomActionBar.tsx` - New bottom action bar component
2. `./src/hooks/useResizableDrawer.ts` - Hook for drawer resize logic (recommended)
3. `./src/components/CalendarLayout.tsx` - Update to conditionally render sidebar or bottom bar

Ensure the component integrates with the existing props flow from time-manager/page.tsx without requiring changes to the parent component.
</output>

<verification>
Before declaring complete, verify:

1. Test on desktop (1024px+): Sidebar visible on side, bottom bar hidden
2. Test on tablet landscape (768-1023px): Sidebar visible on side
3. Test on tablet portrait (640-767px): Bottom bar visible, sidebar hidden
4. Test on mobile (<640px): Bottom bar visible and functional

5. Bottom bar behavior:
   - Pull tab expands/collapses smoothly
   - Dragging resizes the height correctly
   - Tapping toggles state
   - No interference with calendar scrolling

6. Mode switching works:
   - Double-click calendar slot → bottom bar expands with event creation form
   - Select event → bottom bar shows event details
   - Click batch add → bottom bar shows batch add panel

7. Visual consistency:
   - Matches theme colors (test light and dark modes)
   - Transitions are smooth (no jank)
   - Pull tab is clearly visible and accessible
</verification>

<success_criteria>
- Bottom action bar appears only on narrow/mobile viewports
- Desktop sidebar behavior is unchanged
- All action modes (create, details, batch) work in bottom bar
- Pull tab allows resizing with smooth animations
- Component works across all three calendar views
- No regressions to existing functionality
</success_criteria>
