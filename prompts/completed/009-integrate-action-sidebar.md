<objective>
Integrate the ActionSidebar component into all calendar views (Day, Week, Month, Year) and create a unified layout container. The sidebar should be persistent and visible across all views, with empty time slot clicks triggering the inline event creation mode.
</objective>

<context>
Project: evangelo-sommer (Next.js 15 + React 19 + TypeScript + Tailwind CSS 4)
Depends on: Prompt 008 (ActionSidebar component must exist)

Current calendar views:
@src/components/UnifiedDailyPlanner.tsx - Day view with existing sidebar (to be replaced)
@src/components/WeekView.tsx - Week view (no sidebar currently)
@src/components/YearView.tsx - Year view (will be moved to sidebar in prompt 010)
@src/contexts/ViewManagerContext.tsx - Global view state

The ActionSidebar component created in prompt 008 should now be integrated.
</context>

<requirements>
1. **Create CalendarLayout Container**
   Create `src/components/CalendarLayout.tsx` that wraps calendar views with the ActionSidebar:

   ```typescript
   interface CalendarLayoutProps {
     children: React.ReactNode
     selectedDate: Date
     currentView: 'day' | 'week' | 'month' | 'year'
     events: UnifiedEvent[]
     onDateSelect: (date: Date) => void
     onViewChange: (view: string) => void
     onEventCreate: (eventData: UnifiedEvent) => void
     onRefreshTrigger?: () => void
   }
   ```

   Layout structure:
   ```
   +----------------------------------+------------+
   |                                  |            |
   |         Calendar View            |   Action   |
   |         (children)               |   Sidebar  |
   |                                  |            |
   +----------------------------------+------------+
   ```

   - Main content: flex-1, overflow handling
   - Sidebar: fixed width (w-80 or 320px), right side
   - Responsive: sidebar hidden on mobile, shown as bottom sheet or modal on small screens

2. **Modify UnifiedDailyPlanner.tsx**
   - Remove the existing "Mission Objectives" sidebar code (lines 776-817)
   - Remove the objectives-related state and rendering from this component
   - Update `handleTimeSlotClick` to trigger event creation mode in parent
   - Add callback prop `onTimeSlotSelect?: (date: Date, hour: number) => void`
   - Keep the main timeline/agenda rendering

3. **Modify WeekView.tsx**
   - Add callback prop `onTimeSlotSelect?: (date: Date, hour: number) => void`
   - Ensure `handleTimeSlotClick` calls the parent callback
   - Remove any inline modal handling if event creation will be in sidebar

4. **Update Time Manager Page/Container**
   The page that hosts these views needs to:
   - Manage `isEventCreationMode` state
   - Manage `selectedEventTime` state
   - Pass callbacks to both CalendarLayout and child views
   - Handle event creation submission

   Pattern:
   ```tsx
   const [isEventCreationMode, setIsEventCreationMode] = useState(false)
   const [eventCreationTime, setEventCreationTime] = useState<string | null>(null)

   const handleTimeSlotClick = (date: Date, hour: number) => {
     setEventCreationTime(`${hour.toString().padStart(2, '0')}:00`)
     setIsEventCreationMode(true)
   }

   const handleEventCreated = (event: UnifiedEvent) => {
     // Create event via API
     setIsEventCreationMode(false)
     setEventCreationTime(null)
   }
   ```

5. **Empty Cell Click Behavior**
   When user clicks an empty time slot in day or week view:
   - Capture the date and hour from the click
   - Set sidebar to event creation mode
   - Pre-populate the start time in the event form
   - Event form appears inline in the sidebar, replacing default panels
</requirements>

<implementation>
Layout CSS approach using Tailwind:
```tsx
<div className="flex h-full">
  <main className="flex-1 overflow-y-auto">
    {children}
  </main>
  <aside className="hidden lg:block w-80 border-l border-border overflow-y-auto">
    <ActionSidebar {...sidebarProps} />
  </aside>
</div>
```

For mobile responsiveness, consider:
- `lg:block` for desktop sidebar
- Mobile: floating action button or bottom sheet pattern

Callback wiring pattern in views:
```tsx
// In WeekView
const handleTimeSlotClick = (date: Date, hour: number) => {
  if (onTimeSlotSelect) {
    onTimeSlotSelect(date, hour)
  } else if (enableEventCreation) {
    // Fallback to local modal handling
    setModalInitialDate(date)
    setModalInitialTime(`${hour.toString().padStart(2, '0')}:00`)
    setShowEventModal(true)
  }
}
```
</implementation>

<output>
Create:
- `./src/components/CalendarLayout.tsx` - Layout wrapper with sidebar

Modify:
- `./src/components/UnifiedDailyPlanner.tsx` - Remove objectives sidebar, add callback prop
- `./src/components/WeekView.tsx` - Add callback prop for time slot selection
</output>

<verification>
Before completing:
- Verify CalendarLayout renders children and sidebar side by side
- Verify clicking empty time slots in day view triggers event creation mode
- Verify clicking empty time slots in week view triggers event creation mode
- Verify sidebar transitions between default view and event creation view
- Verify no TypeScript errors
- Test responsive behavior (sidebar hidden on mobile)
</verification>

<success_criteria>
- CalendarLayout component wraps calendar views with persistent sidebar
- Empty time slot clicks trigger sidebar event creation mode
- Event creation form appears inline in sidebar
- Existing functionality (drag-drop, resize, event viewing) still works
- Day and Week views properly communicate with parent via callbacks
- Layout is responsive (sidebar behavior on mobile defined)
</success_criteria>
