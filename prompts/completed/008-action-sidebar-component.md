<objective>
Create a new ActionSidebar component for the Time Manager that replaces the existing "Mission Objectives" sidebar. This component will serve as a dynamic, persistent action bar on the right side of each calendar view with stacked panels and multiple functional modes.

The sidebar will be the central control panel for quick navigation, event creation, and accessing analytics.
</objective>

<context>
Project: evangelo-sommer (Next.js 15 + React 19 + TypeScript + Tailwind CSS 4)
Location: Becky CRM web app, Time Manager section

Current state:
- `src/components/UnifiedDailyPlanner.tsx` has a "Mission Objectives" sidebar (lines 776-788) that only shows in combined view mode
- The objectives panel is date-specific, stored in localStorage with key `mission-objectives-{date}`
- Uses neomorphic design system with CSS variables (neo-card, neo-button, neo-inset classes)

Key files to examine:
@src/components/UnifiedDailyPlanner.tsx - Current sidebar implementation (renderObjectives function, lines 563-650)
@src/components/WeekView.tsx - Week view that needs sidebar integration
@src/components/YearView.tsx - Reference for mini-calendar grid styling
@src/contexts/ViewManagerContext.tsx - View state management (selectedDate, currentView)
</context>

<requirements>
1. Create `src/components/ActionSidebar.tsx` with the following structure:

   **Default View (Stacked Panels):**
   - Mini Calendar Panel (top)
     - Month name header with up/down chevron icons
     - 7-column day grid (S M T W T F S)
     - Days are clickable to navigate to day/week view
     - Current actual day highlighted with accent ring
     - Days with events show dot indicator
     - When navigating away from current month, show "return to today" icon

   - Mission Objectives Panel (middle)
     - Preserve existing quick-add functionality
     - Priority-based sorting
     - Completion toggle and delete
     - Collapsed by default, expandable

   - Upcoming Events Panel (bottom)
     - Show next 3-5 events from current date
     - Quick preview with time, title, client
     - Collapsed by default, expandable

2. **Event Creation Mode:**
   - When user clicks empty time slot OR "Add Event" button, sidebar transitions to show EventCreationModal content inline
   - Replace default stacked panels view with the event form
   - Include back/cancel button to return to default view
   - Pass through the selected date/time from the calendar click

3. **Props Interface:**
   ```typescript
   interface ActionSidebarProps {
     selectedDate: Date
     currentView: 'day' | 'week' | 'month' | 'year'
     onDateSelect: (date: Date) => void
     onViewChange?: (view: 'day' | 'week') => void
     onEventCreate?: (eventData: UnifiedEvent) => void
     events: UnifiedEvent[]
     isEventCreationMode?: boolean
     initialEventTime?: string
     onExitEventCreation?: () => void
   }
   ```

4. **Mini Calendar Navigation Logic:**
   - State: `displayedMonth: Date` (defaults to current month)
   - Up chevron: go to previous month
   - Down chevron: go to next month
   - Show "return to today" icon when `displayedMonth` is not current actual month
   - Clicking a day: call `onDateSelect(date)` and navigate to day or week view based on `currentView`
</requirements>

<implementation>
Design patterns to follow:
- Use existing neomorphic styles (neo-card, neo-button, neo-inset, neo-button-active)
- Follow the collapsible panel pattern from UnifiedDailyPlanner (showObjectives toggle)
- Use date-fns for all date operations (already imported in project)
- Use lucide-react icons (ChevronUp, ChevronDown, RotateCcw for return, Plus, Calendar, Target, Clock)
- Match the existing Badge, Card components from @/components/ui/

Mini calendar grid styling reference (from YearView):
```tsx
<div className="grid grid-cols-7 gap-1">
  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
    <div key={index} className="text-xs text-center text-muted-foreground font-bold py-1 font-primary uppercase">
      {day}
    </div>
  ))}
</div>
```

Panel collapse pattern:
```tsx
const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set(['calendar']))
const togglePanel = (panel: string) => {
  setExpandedPanels(prev => {
    const next = new Set(prev)
    if (next.has(panel)) next.delete(panel)
    else next.add(panel)
    return next
  })
}
```
</implementation>

<output>
Create the following file:
- `./src/components/ActionSidebar.tsx` - Main action sidebar component

Do NOT modify existing files in this prompt. Integration will happen in prompt 002.
</output>

<verification>
Before completing, verify:
- Component compiles without TypeScript errors
- All imports resolve correctly
- Props interface matches the specification
- Mini calendar correctly calculates days for any month
- Event creation mode properly shows/hides based on isEventCreationMode prop
- Neomorphic styling classes are applied consistently
</verification>

<success_criteria>
- ActionSidebar component exists at src/components/ActionSidebar.tsx
- Component renders stacked panels (calendar, objectives, upcoming events)
- Mini calendar shows correct days with navigation controls
- Panel expand/collapse functionality works
- TypeScript types are properly defined
- Component is ready for integration with calendar views
</success_criteria>
