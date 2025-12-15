<objective>
Add analytics tabs to the ActionSidebar component, moving the mock analytics components (weekly-summary, upcoming-events, activity-heatmap) into sidebar tab views. Also integrate a condensed version of the Year calendar view into the sidebar as the default mini-calendar.
</objective>

<context>
Project: evangelo-sommer (Next.js 15 + React 19 + TypeScript + Tailwind CSS 4)
Depends on: Prompts 008 and 009 (ActionSidebar and CalendarLayout must exist)

Current analytics mock locations:
@src/components/WeekView.tsx - Week Summary section (lines 794-823)
@src/components/YearView.tsx - Activity Heatmap, Year Statistics

The ActionSidebar now needs tab navigation to switch between:
1. Default view (stacked panels with mini-calendar, objectives, upcoming)
2. Analytics view (weekly summary, activity heatmap, statistics)
</context>

<requirements>
1. **Add Tab Navigation to ActionSidebar**
   Add a tab bar at the top of the sidebar:
   - Tab 1: "Overview" (default stacked panels view) - Calendar icon
   - Tab 2: "Analytics" - TrendingUp/BarChart icon

   Tab styling should match neomorphic design:
   ```tsx
   <div className="neo-inset flex rounded-lg p-1 mb-4">
     <button className={`flex-1 px-3 py-1.5 text-xs rounded-md ... ${activeTab === 'overview' ? 'neo-button-active' : ''}`}>
       <Calendar className="h-4 w-4 mr-1" />
       Overview
     </button>
     <button className={`flex-1 px-3 py-1.5 text-xs rounded-md ... ${activeTab === 'analytics' ? 'neo-button-active' : ''}`}>
       <TrendingUp className="h-4 w-4 mr-1" />
       Analytics
     </button>
   </div>
   ```

2. **Analytics Tab Content**
   Create analytics panel components or inline render:

   **Weekly Summary Panel:**
   - Days of week with event counts (badge indicators)
   - Total events, total hours for the week
   - Completion rate bar/percentage
   - Reference WeekView lines 794-823 for current implementation

   **Activity Heatmap Panel:**
   - Condensed version of YearView heatmap (lines 327-368)
   - Show last 12 weeks (84 days) instead of full year
   - Legend: Less → More with color gradient
   - Clicking a day navigates to that day view

   **Quick Stats Panel:**
   - Today's stats: events count, hours scheduled
   - This week's stats
   - This month's stats
   - Use the getYearStats pattern from YearView

3. **Enhanced Mini-Calendar (in Overview tab)**
   The mini-calendar should now:
   - Show event density indicators on days (dot or background color)
   - Use the YearDayIndicator component pattern
   - Support keyboard navigation (arrow keys to move between days)
   - Double-click a day to create event on that day

4. **Data Flow**
   The ActionSidebar needs access to:
   - All events for statistics calculation
   - Events for current week (weekly summary)
   - Events for last 12 weeks (heatmap)

   Add to props interface:
   ```typescript
   interface ActionSidebarProps {
     // ... existing props
     weekEvents?: UnifiedEvent[] // Events for current week
     recentEvents?: UnifiedEvent[] // Events for last 12 weeks
   }
   ```

   Or calculate internally from the full events array using date-fns:
   ```typescript
   const weekStart = startOfWeek(selectedDate)
   const weekEnd = endOfWeek(selectedDate)
   const weekEvents = events.filter(e => {
     const d = new Date(e.startDateTime)
     return d >= weekStart && d <= weekEnd
   })
   ```

5. **Remove Mock Components from Calendar Views**
   After implementing in sidebar:
   - Remove Week Summary from WeekView.tsx (lines 794-823)
   - Remove Activity Heatmap from YearView.tsx (keep year view itself, just remove the heatmap that's now in sidebar)
</requirements>

<implementation>
Tab state management:
```tsx
type SidebarTab = 'overview' | 'analytics'
const [activeTab, setActiveTab] = useState<SidebarTab>('overview')
```

Statistics calculation pattern:
```tsx
const stats = useMemo(() => {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const todayEvents = events.filter(e => isSameDay(new Date(e.startDateTime), now))
  const weekEvents = events.filter(e => {
    const d = new Date(e.startDateTime)
    return d >= weekStart && d <= weekEnd
  })
  const monthEvents = events.filter(e => {
    const d = new Date(e.startDateTime)
    return d >= monthStart && d <= monthEnd
  })

  return {
    today: { count: todayEvents.length, hours: sumDuration(todayEvents) },
    week: { count: weekEvents.length, hours: sumDuration(weekEvents) },
    month: { count: monthEvents.length, hours: sumDuration(monthEvents) }
  }
}, [events])
```

Heatmap grid (12 weeks = 84 days):
```tsx
const heatmapStart = subWeeks(new Date(), 12)
const heatmapDays = eachDayOfInterval({ start: heatmapStart, end: new Date() })
```
</implementation>

<output>
Modify:
- `./src/components/ActionSidebar.tsx` - Add tab navigation and analytics content

Create (optional, for organization):
- `./src/components/sidebar/WeeklySummaryPanel.tsx`
- `./src/components/sidebar/ActivityHeatmapPanel.tsx`
- `./src/components/sidebar/QuickStatsPanel.tsx`

Modify (cleanup):
- `./src/components/WeekView.tsx` - Remove Week Summary section
- `./src/components/YearView.tsx` - Remove Activity Heatmap section (keep year calendar grid)
</output>

<verification>
Before completing:
- Verify tab switching works between Overview and Analytics
- Verify weekly summary shows correct event counts per day
- Verify activity heatmap renders last 12 weeks with correct density colors
- Verify clicking heatmap day navigates to that day
- Verify statistics update when events change
- Verify no duplicate analytics UI (removed from original views)
- Run type-check to ensure no TypeScript errors
</verification>

<success_criteria>
- ActionSidebar has working tab navigation (Overview / Analytics)
- Analytics tab shows weekly summary, activity heatmap, quick stats
- Heatmap is interactive (click to navigate)
- Statistics are accurately calculated from events data
- Mock components removed from WeekView and YearView
- All existing sidebar functionality still works (calendar navigation, objectives, event creation)
</success_criteria>
