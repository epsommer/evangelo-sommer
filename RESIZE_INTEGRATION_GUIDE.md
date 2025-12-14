# Calendar Event Resize Integration - Implementation Guide

## Overview

This document describes the integration of calendar event resize functionality with database persistence and external calendar synchronization (Google Calendar and mobile app sync).

## Implementation Date
December 13, 2025

## Architecture

### Data Flow

```
User resizes event
    ↓
useEventResize hook (visual feedback)
    ↓
useEventMutation hook (optimistic update)
    ↓
API call to /api/events (PUT)
    ↓
Database update (Prisma)
    ↓
Google Calendar sync (automatic)
    ↓
Mobile app receives update (shared backend)
    ↓
Success toast OR error rollback
```

## Files Created/Modified

### New Files

1. **`/src/lib/toast.ts`**
   - Toast notification system for user feedback
   - Supports success, error, warning, and info messages
   - Auto-dismiss with configurable duration
   - Action buttons (e.g., "Retry")
   - Singleton pattern for easy use

2. **`/src/hooks/useEventMutation.ts`**
   - Manages event updates with optimistic updates
   - Automatic rollback on error
   - Integrates with toast notifications
   - Loading states and error handling

### Modified Files

1. **`/src/hooks/useEventResize.ts`**
   - Added persistence integration via `useEventMutation`
   - New options: `enablePersistence`, `onPersistSuccess`, `onPersistError`
   - New return values: `isPersisting`, `persistError`
   - Automatic database update on resize end

## Key Features

### 1. Optimistic Updates

The UI updates immediately when the user resizes an event. If the API call fails, the change is automatically rolled back.

```typescript
// In useEventMutation.ts
const optimisticEvent = {
  ...originalEvent,
  ...updates,
  updatedAt: new Date().toISOString()
}
setState({ optimisticEvent })

// API call happens in background
// If it fails, state reverts to original
```

### 2. Database Persistence

Updates are sent to the database via the existing `/api/events` endpoint:

```typescript
PUT /api/events?id={eventId}
Body: {
  startDateTime: "2025-12-13T14:30:00",
  endDateTime: "2025-12-13T15:30:00",
  duration: 60
}
```

The API endpoint already handles:
- Database updates (Prisma)
- Google Calendar sync
- Error handling
- Response with sync status

### 3. External Calendar Sync

The `/api/events` PUT endpoint automatically triggers sync to external calendars:

```typescript
// From /src/app/api/events/route.ts (lines 681-687)
const externalSyncResults = await syncEventToExternalCalendars(updatedEvent, prisma, 'update')
const syncedProviders = externalSyncResults.filter(r => r.success).map(r => r.provider)
```

Currently supports:
- Google Calendar (implemented)
- Notion (placeholder for future implementation)

### 4. Mobile App Sync

The mobile app (Becky - React Native) syncs via the shared backend API. When an event is updated in the database, the mobile app receives the update through:

1. **Polling** - App periodically fetches events from `/api/events?source=database`
2. **Push notifications** - Can be triggered after updates (optional)
3. **Real-time sync** - WebSocket or similar (if implemented)

### 5. Error Handling

Multiple layers of error handling:

1. **Network errors**: Show toast with retry option
2. **Validation errors**: Display specific error message
3. **Sync failures**: Update locally, queue for retry
4. **Conflicts**: Last-write-wins (can be enhanced)

```typescript
// Toast with retry action
toast.error(
  'Failed to update event',
  5000,
  {
    label: 'Retry',
    onClick: () => updateEvent(eventId, updates)
  }
)
```

### 6. User Feedback

Visual feedback at every step:

- **During resize**: Preview overlay shows new times
- **After resize**: Brief loading indicator (non-blocking)
- **Success**: Green toast "Event updated successfully and synced to Google Calendar"
- **Error**: Red toast with error message and retry button

## Usage Examples

### Basic Usage (with persistence)

```typescript
import { useEventResize } from '@/hooks/useEventResize'

function MyCalendar() {
  const {
    isResizing,
    handleResizeStart,
    handleResizeEnd,
    isPersisting,
    persistError
  } = useEventResize({
    pixelsPerHour: 80,
    snapMinutes: 15,
    enablePersistence: true, // Default: true
    onPersistSuccess: (event) => {
      console.log('Event persisted:', event)
      // Refresh calendar or update local state
    },
    onPersistError: (error, originalEvent) => {
      console.error('Persist failed:', error)
      // Handle error (already rolled back automatically)
    }
  })

  return (
    <div>
      {isPersisting && <LoadingSpinner />}
      {persistError && <ErrorBanner error={persistError} />}
      {/* Calendar UI */}
    </div>
  )
}
```

### Disable Persistence (visual only)

```typescript
const { isResizing, handleResizeStart, handleResizeEnd } = useEventResize({
  enablePersistence: false, // No database updates
  onResizeEnd: (event, newStart, newEnd) => {
    // Handle resize manually
    console.log('Resized to:', newStart, newEnd)
  }
})
```

### Custom Error Handling

```typescript
const { updateEvent } = useEventMutation({
  showToasts: false, // Disable automatic toasts
  onSuccess: (event) => {
    // Custom success handling
    customNotification.show('Saved!')
  },
  onError: (error, originalEvent) => {
    // Custom error handling
    customErrorModal.show(error.message)
  }
})
```

## API Endpoint Details

### PUT /api/events?id={eventId}

**Request:**
```json
{
  "startDateTime": "2025-12-13T14:30:00",
  "endDateTime": "2025-12-13T15:30:00",
  "duration": 60
}
```

**Response (Success):**
```json
{
  "success": true,
  "event": { /* updated event */ },
  "database": {
    "persisted": true,
    "eventId": "evt_123"
  },
  "externalSync": [
    { "provider": "GOOGLE", "success": true, "externalId": "gcal_456" }
  ],
  "message": "Event updated successfully and persisted to database and synced to GOOGLE"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Event not found in localStorage or database"
}
```

## Configuration

### Environment Variables

Required for Google Calendar sync:
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
```

### Resize Configuration

```typescript
interface UseEventResizeOptions {
  pixelsPerHour?: number        // Default: 80
  snapMinutes?: number           // Default: 15
  enablePersistence?: boolean    // Default: true
  onResizeStart?: (event, handle) => void
  onResizeEnd?: (event, newStart, newEnd) => void
  onResize?: (event, previewStart, previewEnd) => void
  onPersistSuccess?: (event) => void
  onPersistError?: (error, originalEvent) => void
}
```

## Testing Checklist

### Manual Testing

- [ ] Resize event → database is updated with new times
- [ ] Check database directly to confirm persistence
- [ ] Google Calendar reflects the change (may take a moment)
- [ ] Mobile app shows updated event times
- [ ] Disconnect network → resize → error shown → visual state reverts
- [ ] Rapid resizes don't create race conditions
- [ ] No duplicate API calls for single resize
- [ ] TypeScript compiles without errors
- [ ] No console errors during sync

### Database Verification

```sql
-- Check event was updated
SELECT id, title, "startDateTime", "endDateTime", "updatedAt"
FROM "Event"
WHERE id = 'your_event_id';
```

### Network Tab Testing

1. Open browser DevTools → Network tab
2. Resize an event
3. Verify single PUT request to `/api/events?id=...`
4. Check response includes `externalSync` array
5. Confirm no errors in console

## Known Limitations

1. **Conflict Resolution**: Currently uses last-write-wins. Consider implementing:
   - Optimistic locking with version numbers
   - Conflict detection UI
   - Merge strategies

2. **Offline Support**: Requires network connection. Consider:
   - Queue failed updates for retry
   - Service worker for offline persistence
   - Sync when connection restored

3. **Google Calendar Update**: Currently creates new event instead of updating existing one (TODO on line 306 of `/api/events/route.ts`)
   - Need to store Google Calendar event ID in event metadata
   - Use `calendar.events.update()` instead of `insert()`

4. **Real-time Sync**: Mobile app may not receive updates immediately
   - Consider WebSocket connection for real-time updates
   - Push notifications for critical changes

## Future Enhancements

### 1. Enhanced Conflict Detection

```typescript
// Detect if event was modified by another user
const currentVersion = await fetchEventVersion(eventId)
if (currentVersion !== expectedVersion) {
  showConflictResolutionUI()
}
```

### 2. Undo/Redo

```typescript
// History stack for undo/redo
const { undo, redo, canUndo, canRedo } = useEventHistory()
```

### 3. Batch Updates

```typescript
// Queue multiple changes and sync in batch
const { queueUpdate, flush } = useEventBatchUpdate()
```

### 4. Real-time Collaboration

```typescript
// WebSocket for live updates
const { subscribe } = useEventSubscription(eventId)
```

## Troubleshooting

### Event not updating in database

1. Check console for API errors
2. Verify event ID exists in database
3. Check Prisma connection
4. Review server logs for errors

### Google Calendar not syncing

1. Verify Google OAuth credentials in environment variables
2. Check `CalendarIntegration` table for active integrations
3. Review `lastSyncError` field for error messages
4. Confirm calendar permissions

### Toast notifications not appearing

1. Check if toast container is in DOM
2. Verify no CSS conflicts hiding toasts
3. Check z-index is higher than other elements
4. Review console for JavaScript errors

### Mobile app not receiving updates

1. Verify mobile app is polling `/api/events`
2. Check mobile app network requests
3. Confirm event ID matches between web and mobile
4. Review API response includes updated event

## Support

For questions or issues:
1. Review this documentation
2. Check console logs for errors
3. Review API endpoint responses
4. Check database state directly
5. Contact development team

## References

- `/src/hooks/useEventResize.ts` - Main resize hook
- `/src/hooks/useEventMutation.ts` - Mutation with optimistic updates
- `/src/lib/toast.ts` - Toast notification system
- `/src/app/api/events/route.ts` - Event API endpoint
- `/src/utils/calendar/resizeCalculations.ts` - Resize calculations
