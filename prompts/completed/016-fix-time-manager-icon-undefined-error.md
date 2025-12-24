<objective>
Fix the production TypeError "Cannot read properties of undefined (reading 'icon')" occurring in the time-manager page after Notion OAuth integration callback.

This error causes the time-manager page to crash on production but works correctly in development.
</objective>

<context>
**Error Details:**
```
Uncaught TypeError: Cannot read properties of undefined (reading 'icon')
    at e6 (page-68ffc2e212c434cd.js:1:149660)
```

**Trigger Scenario:**
1. User goes to system-preferences integrations tab
2. User clicks "Connect" on Notion
3. Notion OAuth flow completes successfully
4. User is redirected back to time-manager with success params
5. Page crashes with the icon undefined error

**Production vs Dev:**
- Production shows stale localStorage date: `Wed Nov 12 2025`
- Dev shows current date: `Wed Dec 24 2025`
- Dev works correctly, production crashes

**Additional Context:**
- 401 error on `/api/calendar/google/sync` (likely expired Google OAuth tokens)
- Notion integration appears to complete successfully
- The error occurs during render, not during data fetching

**Files to examine:**
@src/components/TimeManagerNavigation.tsx - VIEW_CONFIGS lookup at line 186
@src/components/CalendarIntegrationManager.tsx - getAvailableProviders at line 403-420
@src/lib/calendar-service.ts - getProviderInfo and getAvailableProviders methods
@src/contexts/ViewManagerContext.tsx - currentView state initialization
</context>

<analysis>
The error `.icon` on undefined suggests one of these scenarios:

1. **TimeManagerNavigation.tsx:186** - `VIEW_CONFIGS[currentView as TimeManagerView].icon`
   - If `currentView` is undefined or an invalid value, the lookup returns undefined
   - The `useViewManager()` hook may return undefined state before initialization

2. **CalendarIntegrationManager.tsx:420** - `{provider.icon}`
   - `getAvailableProviders()` returns an array that could contain undefined items
   - Called when rendering the integrations tab

3. **ViewManagerContext initialization race condition**
   - During SSR or initial hydration, `state.currentView` might be undefined
   - The loading state (`isLoading`) should guard against this but may not be

4. **Stale localStorage data causing invalid view state**
   - Old localStorage data may have a view value that's no longer valid
</analysis>

<requirements>
1. Add defensive null checks before accessing `.icon` property
2. Ensure `VIEW_CONFIGS` lookup has proper fallback for invalid view values
3. Add null filtering to `getAvailableProviders()` return array
4. Add loading guard in TimeManagerNavigation to prevent rendering before state is initialized
5. Handle edge case where currentView could be undefined during hydration
</requirements>

<implementation>
Apply fixes to these specific files:

**1. src/components/TimeManagerNavigation.tsx**
Add null check before accessing config.icon:

```tsx
// Line 184-191: Add defensive check
{Object.entries(VIEW_CONFIGS).map(([viewKey, config]) => {
  if (!config) return null  // Guard against undefined config
  const view = viewKey as TimeManagerView
  const Icon = config.icon
  // ... rest of render
})}
```

Also add a guard for the current view config lookup:

```tsx
// When accessing VIEW_CONFIGS with currentView
const currentConfig = VIEW_CONFIGS[currentView]
if (!currentConfig) {
  // Handle invalid/missing view - fallback to day view
  setCurrentView('day')
  return null
}
const CurrentIcon = currentConfig.icon
```

**2. src/lib/calendar-service.ts**
Add null filtering to getAvailableProviders:

```tsx
// Line 235-243
getAvailableProviders() {
  return [
    this.getProviderInfo('google'),
    this.getProviderInfo('notion'),
    this.getProviderInfo('outlook'),
    this.getProviderInfo('apple'),
    this.getProviderInfo('custom')
  ].filter(Boolean) as NonNullable<ReturnType<typeof this.getProviderInfo>>[]
}
```

**3. src/components/CalendarIntegrationManager.tsx**
Add null check when mapping providers:

```tsx
// Line 403
{providers.filter(Boolean).map((provider) => {
  if (!provider) return null  // Extra safety check
  // ... rest of component
})}
```

**4. src/contexts/ViewManagerContext.tsx**
Ensure valid initial state and handle undefined currentView:

```tsx
// Add validation in the initialization effect
if (!initialState.currentView || !['day', 'week', 'month'].includes(initialState.currentView)) {
  initialState.currentView = 'day'
}
```
</implementation>

<verification>
After implementing fixes:

1. Run `npm run build` to ensure no build errors
2. Run `npm run dev` and test the flow:
   - Navigate to system-preferences
   - Go to integrations tab
   - Confirm page loads without errors
   - Click "Connect" on Notion (if available)
   - Verify redirect back to time-manager works
3. Clear localStorage and refresh to test fresh state
4. Test with invalid localStorage data to verify fallbacks work
</verification>

<success_criteria>
- No TypeError about undefined icon property
- Time-manager page loads correctly after OAuth callback
- Invalid view state falls back gracefully to 'day' view
- Production build succeeds with no errors
- All existing functionality preserved
</success_criteria>
</content>
</invoke>