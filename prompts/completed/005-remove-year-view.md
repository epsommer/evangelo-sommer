<objective>
Remove the Year View feature from the calendar application.

This includes removing the YearView component, removing year view options from view selectors, and cleaning up any related code references.
</objective>

<context>
This is the Becky CRM/Time Manager application built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

Key files to examine:
- `src/components/YearView.tsx` - The year view component to be removed
- `src/components/ViewSelector.tsx` - View switcher that includes year option
- `src/components/ActionSidebar.tsx` - Has year view in `currentView` prop type
- `src/contexts/ViewManagerContext.tsx` - May have year view type definitions

Current behavior:
- ViewSelector shows Day, Week, Month, Year options
- YearView displays 12 mini-month calendars with event density
- Clicking a month or day in YearView navigates to that date

Target behavior:
- Only Day, Week, Month views available
- Year view option removed from all selectors and navigation
- Clean removal with no broken references
</context>

<requirements>
1. Delete YearView component file
   - Remove `src/components/YearView.tsx`

2. Update view type definitions
   - Remove 'year' from view type unions
   - Update ViewManagerContext if it defines view types
   - Update ActionSidebar props type

3. Update ViewSelector component(s)
   - Remove year option from view buttons/tabs
   - Ensure layout still looks correct with 3 options

4. Update any parent components that reference year view
   - Remove year view rendering conditions
   - Remove year-specific handlers
   - Clean up imports of YearView

5. Handle any year view fallbacks
   - If current view is 'year', default to 'month' instead
   - Update any persisted state that might have 'year' saved

6. Update ActionSidebar
   - Remove 'year' from `currentView` type
   - Adjust any year-specific logic in mini calendar or navigation
</requirements>

<implementation>
Search for all references to YearView and 'year' view:
- `grep -r "YearView" src/`
- `grep -r "'year'" src/components/`
- `grep -r '"year"' src/components/`

Files likely to need updates:
- ViewSelector.tsx / ViewSelectorFixed.tsx / ViewSelectorDebug.tsx
- ViewManagerContext.tsx
- ActionSidebar.tsx
- Any page or layout that renders views conditionally

Type updates:
```typescript
// Before
type CalendarView = 'day' | 'week' | 'month' | 'year'

// After
type CalendarView = 'day' | 'week' | 'month'
```

Why remove year view: Per user request - the year view may not provide sufficient value for the CRM use case, and the heatmap/statistics functionality has been moved to the ActionSidebar's analytics tab.
</implementation>

<output>
Delete:
- `src/components/YearView.tsx`

Modify:
- `src/components/ViewSelector.tsx` - Remove year option
- `src/components/ViewSelectorFixed.tsx` - Remove year option (if exists)
- `src/components/ViewSelectorDebug.tsx` - Remove year option (if exists)
- `src/contexts/ViewManagerContext.tsx` - Update type definitions
- `src/components/ActionSidebar.tsx` - Update prop types
- Any other files that reference YearView or 'year' view
</output>

<verification>
Before declaring complete:
1. Run TypeScript type check: `npx tsc --noEmit`
2. Verify no import errors or broken references
3. Navigate through all available views (Day, Week, Month)
4. Verify ViewSelector only shows 3 options
5. Verify no console errors related to missing year view
6. Verify build succeeds: `npm run build`
</verification>

<success_criteria>
- YearView.tsx file is deleted
- 'year' option is removed from all view selectors
- Type definitions updated to exclude 'year'
- No TypeScript errors
- No runtime errors when switching views
- Application builds successfully
- All remaining views (day, week, month) work correctly
</success_criteria>
