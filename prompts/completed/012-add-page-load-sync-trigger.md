<objective>
Implement automatic sync trigger on page load for the Time Manager calendar.

Currently, sync only happens when the user manually clicks the sync button. This means events can become stale between sessions. Add automatic sync when the Time Manager page loads to ensure users always see current data.
</objective>

<context>
This is the second step in fixing calendar sync. The previous prompt (011) fixed database persistence for inbound sync. Now we need to trigger that sync automatically.

Key files:
- @src/app/time-manager/page.tsx - The Time Manager page component
- @src/lib/calendar-sync.ts - Sync functions to call
- @src/components/CalendarIntegrationManager.tsx - Contains manual sync button logic for reference
- @src/hooks/useUnifiedEvents.ts - Event state management hook

The sync should:
1. Happen once when the page loads
2. Not block the initial render (run in background)
3. Update the UI when new events are fetched
4. Handle errors gracefully without breaking the page
</context>

<requirements>
1. Add a `useEffect` hook in the Time Manager page that triggers sync on mount

2. Call the sync API endpoint (not the function directly, to ensure proper server-side execution)

3. After sync completes, refresh the events list to show newly imported events

4. Implement loading state indicator during sync (subtle, non-blocking)

5. Handle sync failures gracefully:
   - Log errors to console
   - Don't show error modal for background sync failures
   - User can still use the page normally

6. Prevent multiple simultaneous syncs (debounce/flag)

7. Only sync if user has connected integrations
</requirements>

<implementation>
Pattern for page-load sync:

```typescript
// In page.tsx or a custom hook
const [isSyncing, setIsSyncing] = useState(false);
const hasSynced = useRef(false);

useEffect(() => {
  const syncOnLoad = async () => {
    if (hasSynced.current || isSyncing) return;
    hasSynced.current = true;

    // Check if user has any connected integrations first
    const integrationsRes = await fetch('/api/calendar/integrations');
    const integrations = await integrationsRes.json();

    if (!integrations.length) return;

    setIsSyncing(true);
    try {
      await fetch('/api/calendar/google/sync', { method: 'POST' });
      // Refresh events after sync
      await refetchEvents();
    } catch (error) {
      console.error('Background sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  syncOnLoad();
}, []);
```

Add a subtle sync indicator:
```tsx
{isSyncing && (
  <div className="text-xs text-muted-foreground">
    Syncing calendar...
  </div>
)}
```
</implementation>

<output>
Modify these files:
- `./src/app/time-manager/page.tsx` - Add page-load sync effect

Optionally create:
- `./src/hooks/useCalendarSync.ts` - If the sync logic becomes complex enough to warrant extraction
</output>

<verification>
Before completing:
- [ ] Sync triggers automatically when Time Manager page loads
- [ ] Sync runs in background without blocking UI
- [ ] Events list updates after sync completes
- [ ] Multiple rapid page loads don't cause multiple syncs
- [ ] Page works normally even if sync fails
- [ ] Code compiles without TypeScript errors
</verification>

<success_criteria>
- Opening Time Manager automatically fetches latest events from Google Calendar
- User sees their Google Calendar events without clicking any buttons
- No visible errors or broken UI during sync
- Performance is acceptable (page doesn't hang during sync)
</success_criteria>
</content>
