<objective>
Fix the UI bounce-back issue where resized events visually revert to their original position despite successful API updates. The database is updating correctly (confirmed via server logs), but React state is not being refreshed to reflect the new times.
</objective>

<context>
Prerequisites: Prompts 001-004 completed.

Current behavior:
- User drags resize handle (top or bottom)
- Event visually resizes during drag
- On mouse release, API PUT request succeeds (200 OK)
- Database updates correctly with new startDateTime/endDateTime
- **UI immediately snaps back to original position**

Root cause hypothesis:
The parent component's event state is not being updated after the API call succeeds. The component re-renders with stale data from its original state, causing the visual "bounce-back".

Tech stack:
- React 19, TypeScript, Next.js 15
- Prisma ORM for database
- Custom hooks: useEventResize.ts, useEventMutation.ts
- Components: CalendarEvent.tsx, WeekView.tsx, DailyPlanner.tsx, UnifiedDailyPlanner.tsx

Key files to investigate:
- `src/hooks/useEventResize.ts` - Has `onResizeEnd` callback and optional persistence
- `src/hooks/useEventMutation.ts` - Handles API calls but may not update parent state
- `src/components/WeekView.tsx` - Uses `handleEventResize` that calls `updateEvent`
- `src/components/calendar/CalendarEvent.tsx` - Uses useEventResize with `enablePersistence: false`
</context>

<requirements>

## Problem Analysis
1. Trace the complete data flow from resize end to UI update
2. Identify where React state gets out of sync with database
3. Determine if the issue is:
   - Missing state update after successful API call
   - Stale closure capturing old event data
   - Parent component not re-fetching events
   - Optimistic update not being applied

## Fix Requirements
1. **Optimistic UI Update**: Event should immediately show new position on resize end
2. **State Synchronization**: Parent component's event list must reflect the change
3. **Rollback on Failure**: If API fails, revert to original position with error toast
4. **No Double-Updates**: Prevent race conditions between optimistic update and API response

## Affected Views
- Day View (DailyPlanner.tsx)
- Week View (WeekView.tsx)
- Unified Daily Planner (UnifiedDailyPlanner.tsx)

</requirements>

<implementation>

## Option A: Optimistic State Update Pattern
Update parent state immediately when resize ends, before API call:

```typescript
// In WeekView.tsx handleEventResize
const handleEventResize = async (event: UnifiedEvent, newStartTime: string, newEndTime: string) => {
  // 1. Store original for rollback
  const originalEvent = { ...event }

  // 2. Optimistically update local state
  setEvents(prev => prev.map(e =>
    e.id === event.id
      ? { ...e, startDateTime: newStartTime, endDateTime: newEndTime }
      : e
  ))

  try {
    // 3. Persist to database
    await updateEvent(event.id, {
      startDateTime: newStartTime,
      endDateTime: newEndTime,
      duration: calculateDuration(newStartTime, newEndTime)
    })
  } catch (error) {
    // 4. Rollback on failure
    setEvents(prev => prev.map(e =>
      e.id === event.id ? originalEvent : e
    ))
    toast.error('Failed to save changes')
  }
}
```

## Option B: Callback-Based State Update
If events come from a parent/context, use callback to propagate update:

```typescript
// In useEventMutation.ts
const updateEvent = async (id: string, updates: Partial<UnifiedEvent>) => {
  const result = await fetch(`/api/events?id=${id}`, { ... })
  if (result.ok) {
    // Notify parent to refresh
    onUpdateSuccess?.(id, updates)
  }
}

// In parent component
const handleUpdateSuccess = (id: string, updates: Partial<UnifiedEvent>) => {
  setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
}
```

## Option C: React Query / SWR Pattern
If using data fetching library, invalidate cache:

```typescript
// After successful update
queryClient.invalidateQueries(['events'])
// or
mutate('/api/events')
```

## Investigation Steps
1. Check how `events` state is managed in WeekView/DailyPlanner
2. Find where events are fetched (API call, props, context)
3. Trace what happens after `updateEvent` returns successfully
4. Add console.log to verify state update timing

</implementation>

<output>
Modify files as needed:
- `src/hooks/useEventMutation.ts` - Add callback for successful updates
- `src/components/WeekView.tsx` - Implement optimistic updates
- `src/components/DailyPlanner.tsx` - Implement optimistic updates
- `src/components/UnifiedDailyPlanner.tsx` - Implement optimistic updates
- `src/components/calendar/CalendarEvent.tsx` - Ensure proper callback flow
</output>

<verification>
Test resize persistence:

**Day View**
- [ ] Resize event from bottom handle - stays in new position
- [ ] Resize event from top handle - stays in new position
- [ ] Refresh page - event shows updated time
- [ ] Check database - times match UI

**Week View**
- [ ] Resize event - stays in new position
- [ ] Move to different day - stays in new day
- [ ] Refresh page - event shows updated time

**Error Handling**
- [ ] Disconnect network, resize event - reverts with error message
- [ ] API returns 500 - reverts with error message

**Console Verification**
- [ ] No stale state warnings
- [ ] No race condition between optimistic and API updates
</verification>

<success_criteria>
- Events stay in their new position after resize (no bounce-back)
- Database and UI are always in sync
- Failed updates show error and revert cleanly
- All calendar views behave consistently
- TypeScript compiles without errors
</success_criteria>
