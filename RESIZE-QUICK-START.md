# Calendar Event Resize - Quick Start Guide

## What Was Implemented

Calendar events in the Becky CRM can now be resized with smooth, mouse-following behavior:

- **Day View**: Resize from top/bottom (adjust time)
- **Week View**: Resize from all 4 corners + all 4 edges (full resize capability)
- **Month View**: No resize (drag-only)

## Using the New Resize System

### In CalendarEvent Component

```tsx
import CalendarEvent from '@/components/calendar/CalendarEvent'

<CalendarEvent
  event={event}
  viewMode="day"  // or "week" or "month"
  pixelsPerHour={80}
  showResizeHandles={true}
  onResizeStart={(event, handle) => {
    console.log('Resize started:', handle)
  }}
  onResizeEnd={(event, newStart, newEnd) => {
    // Update the event in your backend
    await updateEvent(event.id, {
      startDateTime: newStart,
      endDateTime: newEnd
    })
  }}
/>
```

### View-Specific Behavior

**Day View** (`viewMode="day"`):
- Shows top and bottom resize handles
- Top handle: adjusts start time (keeps end fixed)
- Bottom handle: adjusts end time (keeps start fixed)

**Week View** (`viewMode="week"`):
- Shows all 4 corners + top/bottom edges
- Full 2D resize capability
- Corners allow diagonal resize

**Month View** (`viewMode="month"`):
- NO resize handles (automatically disabled)
- Events remain draggable to different days

## New Files Created

```
src/
├── components/calendar/
│   ├── ResizeHandle.tsx       # Reusable resize handle
│   ├── TimeTooltip.tsx        # Time display during resize
│   └── ResizePreview.tsx      # Live preview overlay
├── hooks/
│   └── useEventResize.ts      # Resize state management
└── utils/calendar/
    └── resizeCalculations.ts  # Resize math utilities
```

## Key Features

✅ **Smooth mouse-following**: Event scales directly with cursor movement
✅ **15-minute snapping**: Times snap to quarter-hour increments
✅ **Live tooltip**: Shows current start/end times while resizing
✅ **Minimum duration**: Cannot resize below 15 minutes
✅ **Bounds checking**: Events stay within calendar view
✅ **Touch support**: Works on mobile/tablet devices
✅ **TypeScript**: Full type safety throughout

## Configuration Options

### Snap Interval

Change snap increment (default: 15 minutes):

```tsx
import { useEventResize } from '@/hooks/useEventResize'

const { ... } = useEventResize({
  snapMinutes: 30,  // Snap to 30-minute intervals
  pixelsPerHour: 80
})
```

### Pixels Per Hour

Adjust time-to-pixel scaling:

```tsx
<CalendarEvent
  event={event}
  viewMode="day"
  pixelsPerHour={100}  // Taller events = more granular control
/>
```

### Disable Resize

```tsx
<CalendarEvent
  event={event}
  viewMode="day"
  showResizeHandles={false}  // No resize handles
/>
```

## Testing

### Manual Testing

1. Open Day View or Week View
2. Hover over an event
3. Grab a resize handle (cursor changes to resize arrow)
4. Drag to resize
5. Observe:
   - Event scales smoothly
   - Tooltip follows cursor showing new times
   - Times snap to 15-minute increments
6. Release to save

### Verify Constraints

- Try to resize below 15 minutes (should stop at minimum)
- Try to resize beyond calendar bounds (should stop at boundary)
- Resize from different handles (top, bottom, corners)

## Troubleshooting

### Issue: Resize handles not appearing

**Solution:**
- Check `viewMode` is not `"month"`
- Verify `showResizeHandles={true}`
- Ensure event is not in compact mode

### Issue: Resize not snapping to grid

**Solution:**
- Check `pixelsPerHour` prop matches your calendar grid
- Verify `snapMinutes` setting in `useEventResize` hook

### Issue: TypeScript errors

**Solution:**
Run type check:
```bash
npx tsc --noEmit
```

All types are properly exported from `/src/utils/calendar/index.ts`

## Migration from DragAndDropEvent

If you're currently using `DragAndDropEvent`:

```tsx
// Before
<DragAndDropEvent
  event={event}
  currentDate={dateStr}
  currentHour={hour}
  showResizeHandles={true}
  onResizeEnd={handleResize}
/>

// After
<CalendarEvent
  event={event}
  viewMode="day"
  showResizeHandles={true}
  onResizeEnd={handleResize}
/>
```

Both components work, but `CalendarEvent` provides:
- Better view-mode awareness
- Cleaner resize implementation
- Reusable sub-components
- Better documentation

## Next Steps

1. **Test in your environment**: Open the calendar and try resizing events
2. **Verify database updates**: Check that resize changes persist
3. **Test on mobile**: Verify touch resize works on tablets
4. **Customize if needed**: Adjust snap intervals or styling

## Support

For detailed implementation information, see:
- `/RESIZE-IMPLEMENTATION.md` - Complete technical documentation
- `/src/components/calendar/README.md` - Calendar component guide

## Summary

Resize mechanics are fully implemented and ready to use. Events resize smoothly with direct mouse-following behavior, appropriate constraints, and a professional user experience across all view modes.
