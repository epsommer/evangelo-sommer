# Calendar Resize Hooks - Quick Reference

## Overview

Two hooks work together to provide calendar event resize with database persistence:

1. **`useEventResize`** - Handles UI, drag interactions, and visual feedback
2. **`useEventMutation`** - Handles API calls, optimistic updates, and error handling

## Quick Start

```typescript
import { useEventResize } from '@/hooks/useEventResize'

function CalendarView() {
  const {
    handleResizeStart,
    handleResizeEnd,
    isResizing,
    isPersisting
  } = useEventResize({
    enablePersistence: true // Default: true
  })

  // Use in your calendar event component
  return <CalendarEvent {...resizeHandlers} />
}
```

## useEventResize Hook

### Purpose
Manages the visual resize interaction and triggers database persistence.

### Import
```typescript
import { useEventResize } from '@/hooks/useEventResize'
```

### Options

```typescript
interface UseEventResizeOptions {
  // Visual behavior
  pixelsPerHour?: number           // Default: 80
  snapMinutes?: number              // Default: 15 (snaps to 15-min intervals)

  // Persistence
  enablePersistence?: boolean       // Default: true (auto-save to DB)

  // Callbacks
  onResizeStart?: (event, handle) => void
  onResize?: (event, previewStart, previewEnd) => void
  onResizeEnd?: (event, newStart, newEnd) => void
  onPersistSuccess?: (event) => void
  onPersistError?: (error, originalEvent) => void
}
```

### Returns

```typescript
interface UseEventResizeResult {
  // State
  resizeState: ResizeState          // Current resize state
  isResizing: boolean               // True during resize drag
  isPersisting: boolean             // True during DB save
  persistError: string | null       // Error message if save failed

  // Handlers (pass to event element)
  handleResizeStart: (e, event, handle) => void
  handleResizeEnd: () => void

  // Visual feedback
  previewStyles: CSSProperties      // Styles for resize preview
  mousePosition: { x, y }           // Current mouse position
}
```

### Example: Basic Usage

```typescript
const {
  handleResizeStart,
  handleResizeEnd,
  isResizing,
  previewStyles
} = useEventResize({
  pixelsPerHour: 80,
  snapMinutes: 15,
  enablePersistence: true
})

return (
  <div
    data-event-block
    style={isResizing ? previewStyles : {}}
  >
    <ResizeHandle
      type="top"
      onMouseDown={(e) => handleResizeStart(e, event, 'top')}
    />
    {/* Event content */}
    <ResizeHandle
      type="bottom"
      onMouseDown={(e) => handleResizeStart(e, event, 'bottom')}
    />
  </div>
)
```

### Example: With Callbacks

```typescript
const {
  handleResizeStart,
  handleResizeEnd,
  isPersisting
} = useEventResize({
  enablePersistence: true,
  onPersistSuccess: (event) => {
    console.log('✅ Event saved:', event.id)
    refreshCalendar() // Refresh your calendar view
  },
  onPersistError: (error, originalEvent) => {
    console.error('❌ Save failed:', error)
    // Error already shown in toast
    // UI already rolled back
  }
})
```

### Example: Visual Only (No Persistence)

```typescript
const {
  handleResizeStart,
  handleResizeEnd,
  previewStyles
} = useEventResize({
  enablePersistence: false, // Don't save to database
  onResizeEnd: (event, newStart, newEnd) => {
    console.log('Resized:', { newStart, newEnd })
    // Handle manually (e.g., show confirmation dialog)
  }
})
```

## useEventMutation Hook

### Purpose
Handles event updates with optimistic updates and automatic rollback.

### Import
```typescript
import { useEventMutation } from '@/hooks/useEventMutation'
```

### Options

```typescript
interface UseEventMutationOptions {
  showToasts?: boolean              // Default: true
  onSuccess?: (event) => void
  onError?: (error, originalEvent) => void
}
```

### Returns

```typescript
interface UseEventMutationResult {
  updateEvent: (eventId, updates) => Promise<UnifiedEvent | null>
  state: {
    isLoading: boolean
    error: string | null
    optimisticEvent: UnifiedEvent | null
  }
  rollback: () => void
}
```

### Example: Direct Usage

```typescript
const { updateEvent, state } = useEventMutation({
  showToasts: true,
  onSuccess: (event) => {
    console.log('Event updated:', event)
  },
  onError: (error) => {
    console.error('Update failed:', error)
  }
})

// Update event
const updatedEvent = await updateEvent('evt_123', {
  startDateTime: '2025-12-13T14:30:00',
  endDateTime: '2025-12-13T15:30:00',
  duration: 60
})

if (updatedEvent) {
  console.log('Success!', updatedEvent)
}
```

### Example: Custom Error Handling

```typescript
const { updateEvent } = useEventMutation({
  showToasts: false, // Disable automatic toasts
  onSuccess: (event) => {
    myCustomNotification.show('Saved!')
  },
  onError: (error, originalEvent) => {
    myCustomErrorDialog.show({
      title: 'Save Failed',
      message: error.message,
      actions: [
        { label: 'Retry', onClick: () => updateEvent(originalEvent.id, updates) },
        { label: 'Cancel', onClick: () => {} }
      ]
    })
  }
})
```

## Toast Notifications

The resize integration uses a toast system for user feedback.

### Import
```typescript
import { toast } from '@/lib/toast'
```

### Usage

```typescript
// Success message (green)
toast.success('Event saved!', 3000)

// Error message (red)
toast.error('Failed to save event', 5000)

// Error with retry action
toast.error(
  'Network error',
  5000,
  {
    label: 'Retry',
    onClick: () => retryOperation()
  }
)

// Warning message (yellow)
toast.warning('Connection unstable', 4000)

// Info message (blue)
toast.info('Syncing...', 2000)

// Dismiss specific toast
const toastId = toast.success('Saved!')
toast.dismiss(toastId)

// Dismiss all toasts
toast.dismissAll()
```

## Data Flow

```
User drags resize handle
    ↓
handleResizeStart()
    ↓
Mouse move → visual preview
    ↓
handleResizeEnd()
    ↓
useEventMutation.updateEvent()
    ↓
Optimistic UI update (instant)
    ↓
API: PUT /api/events?id={id}
    ↓
Database update (Prisma)
    ↓
Google Calendar sync
    ↓
Success toast OR error rollback
```

## API Endpoint

The hooks call this endpoint:

```
PUT /api/events?id={eventId}
Content-Type: application/json

{
  "startDateTime": "2025-12-13T14:30:00",
  "endDateTime": "2025-12-13T15:30:00",
  "duration": 60
}
```

Response includes:
- Updated event data
- Database persistence status
- External sync results (Google Calendar, etc.)

## Common Patterns

### Pattern 1: Basic Calendar Event

```typescript
function CalendarEvent({ event }) {
  const {
    handleResizeStart,
    handleResizeEnd,
    isResizing,
    previewStyles
  } = useEventResize()

  return (
    <div style={isResizing ? previewStyles : {}}>
      <ResizeHandle
        type="top"
        onMouseDown={(e) => handleResizeStart(e, event, 'top')}
      />
      <div>{event.title}</div>
      <ResizeHandle
        type="bottom"
        onMouseDown={(e) => handleResizeStart(e, event, 'bottom')}
      />
    </div>
  )
}
```

### Pattern 2: With Loading State

```typescript
function CalendarEvent({ event }) {
  const {
    handleResizeStart,
    handleResizeEnd,
    isPersisting,
    isResizing
  } = useEventResize()

  return (
    <div>
      {isPersisting && <Spinner />}
      {/* Event content */}
    </div>
  )
}
```

### Pattern 3: With Error Display

```typescript
function CalendarEvent({ event }) {
  const {
    handleResizeStart,
    handleResizeEnd,
    persistError
  } = useEventResize({
    onPersistError: (error) => {
      logError(error)
    }
  })

  return (
    <div>
      {persistError && (
        <div className="error">{persistError}</div>
      )}
      {/* Event content */}
    </div>
  )
}
```

### Pattern 4: Refresh After Update

```typescript
function CalendarView() {
  const [refreshKey, setRefreshKey] = useState(0)

  const {
    handleResizeStart,
    handleResizeEnd
  } = useEventResize({
    onPersistSuccess: () => {
      setRefreshKey(k => k + 1) // Force calendar refresh
    }
  })

  return (
    <Calendar key={refreshKey} {...handlers} />
  )
}
```

## Troubleshooting

### Event not saving to database

1. Check console for errors
2. Verify `enablePersistence: true`
3. Check network tab for API call
4. Verify event ID exists

### Toast not appearing

1. Check z-index on container
2. Verify no CSS conflicts
3. Check console for errors

### Rollback not working

1. Error handling is automatic
2. Check console for mutation errors
3. Verify original event state

## TypeScript Types

```typescript
import type { UnifiedEvent } from '@/components/EventCreationModal'
import type { ResizeHandle } from '@/utils/calendar/resizeCalculations'

// Resize handle type
type ResizeHandle = 'top' | 'bottom'

// Toast type
type ToastType = 'success' | 'error' | 'warning' | 'info'
```

## Best Practices

1. **Always enable persistence** unless you have a specific reason not to
2. **Use callbacks** for custom logic after save
3. **Show loading state** with `isPersisting`
4. **Handle errors gracefully** - toasts already shown automatically
5. **Refresh calendar** after successful update
6. **Don't block UI** - updates are non-blocking

## See Also

- `/RESIZE_INTEGRATION_GUIDE.md` - Full implementation guide
- `/RESIZE_INTEGRATION_SUMMARY.md` - High-level summary
- `/src/utils/calendar/resizeCalculations.ts` - Calculation utilities
- `/src/app/api/events/route.ts` - API endpoint
