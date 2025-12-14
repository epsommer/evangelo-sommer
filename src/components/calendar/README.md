# Unified Calendar Event System

This directory contains the unified calendar event component system that provides consistent event styling and overlap handling across all calendar views (day, week, month).

## Components

### CalendarEvent

The main unified event component that adapts to different view modes.

**Key Features:**
- View-adaptive rendering (day/week/month)
- Google Calendar-style overlap positioning
- Conflict detection and visualization
- Resize handle preparation for future implementation
- Drag-and-drop support
- Consistent theming across all views

**Props:**
```typescript
interface CalendarEventProps {
  event: UnifiedEvent
  viewMode: 'day' | 'week' | 'month'
  position?: EventPosition              // Overlap positioning data
  conflicts?: ConflictResult            // System-detected conflicts
  conflictingEvents?: UnifiedEvent[]    // Overlapping events
  pixelsPerHour?: number                // For height calculation
  isCompact?: boolean                   // Force compact mode
  showResizeHandles?: boolean           // Show/hide resize handles
  showDragHandle?: boolean              // Show/hide drag handle
  onClick?: (event: UnifiedEvent) => void
  onConflictClick?: (conflicts: ConflictResult) => void
  onDragStart?: (event: UnifiedEvent, handle: 'body') => void
  onDragEnd?: (event: UnifiedEvent) => void
  onResizeStart?: (event: UnifiedEvent, handle: 'top' | 'bottom') => void
  onResizeEnd?: (event: UnifiedEvent, newStartTime: string, newEndTime: string) => void
  className?: string
  style?: React.CSSProperties
}
```

## Utilities

### Event Overlap Utilities (`/utils/calendar/eventOverlap.ts`)

Implements Google Calendar's column-based overlap algorithm.

**Key Functions:**

#### `calculateEventPositions(events: UnifiedEvent[]): Map<string, EventPosition>`
Main function to calculate overlap positions for all events.

Returns a map of event ID to position information:
```typescript
interface EventPosition {
  event: UnifiedEvent
  column: number        // Column index (0-based)
  maxColumns: number    // Total columns in collision group
  width: number         // Width percentage (100 / maxColumns)
  left: number          // Left position percentage
  zIndex: number        // Stacking order
}
```

#### `eventsOverlap(event1: UnifiedEvent, event2: UnifiedEvent): boolean`
Check if two events overlap in time.

#### `findCollisionGroups(events: UnifiedEvent[]): CollisionGroup[]`
Group events that overlap with each other.

#### `getEventsForTimeSlot(events: UnifiedEvent[], date: Date, hour: number): UnifiedEvent[]`
Filter events for a specific time slot.

#### `calculateEventHeight(event: UnifiedEvent, pixelsPerHour: number): number`
Calculate event height in pixels based on duration.

#### `calculateEventTop(event: UnifiedEvent, pixelsPerHour: number, startHour?: number): number`
Calculate event top position in pixels.

## Usage Examples

### Day View

```tsx
import CalendarEvent from '@/components/calendar/CalendarEvent'
import { calculateEventPositions } from '@/utils/calendar'

function DayView({ events, date }) {
  // Calculate overlap positions
  const positions = calculateEventPositions(events)

  // Render events with overlap positioning
  return (
    <div className="day-view">
      {events.map(event => {
        const position = positions.get(event.id)

        return (
          <CalendarEvent
            key={event.id}
            event={event}
            viewMode="day"
            position={position}
            pixelsPerHour={80}
            showResizeHandles={true}
            showDragHandle={true}
            onClick={handleEventClick}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
          />
        )
      })}
    </div>
  )
}
```

### Week View

```tsx
import CalendarEvent from '@/components/calendar/CalendarEvent'
import { calculateEventPositions, getEventsForTimeSlot } from '@/utils/calendar'

function WeekView({ events, selectedDate }) {
  const weekDays = getWeekDays(selectedDate)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="week-view">
      {weekDays.map(day => (
        <div key={day.toString()} className="day-column">
          {hours.map(hour => {
            // Get events for this time slot
            const slotEvents = getEventsForTimeSlot(events, day, hour)

            // Calculate overlap positions for this slot
            const positions = calculateEventPositions(slotEvents)

            return (
              <div key={hour} className="time-slot">
                {slotEvents.map(event => {
                  const position = positions.get(event.id)

                  return (
                    <CalendarEvent
                      key={event.id}
                      event={event}
                      viewMode="week"
                      position={position}
                      pixelsPerHour={80}
                      showResizeHandles={false}
                      onClick={handleEventClick}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

### Month View

```tsx
import CalendarEvent from '@/components/calendar/CalendarEvent'

function MonthView({ events, selectedDate }) {
  const monthDays = getMonthDays(selectedDate)

  return (
    <div className="month-view grid grid-cols-7">
      {monthDays.map(day => {
        const dayEvents = events.filter(e =>
          isSameDay(new Date(e.startDateTime), day)
        )

        return (
          <div key={day.toString()} className="day-cell">
            <div className="day-number">{format(day, 'd')}</div>

            {/* Show first 3 events */}
            {dayEvents.slice(0, 3).map(event => (
              <CalendarEvent
                key={event.id}
                event={event}
                viewMode="month"
                isCompact={true}
                showResizeHandles={false}
                showDragHandle={false}
                onClick={handleEventClick}
              />
            ))}

            {/* Show overflow indicator */}
            {dayEvents.length > 3 && (
              <div className="more-events">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

## Styling

The system uses CSS custom properties for consistent styling:

```css
:root {
  /* Event spacing and sizing */
  --calendar-event-border-radius: 0.375rem;
  --calendar-event-border-width: 4px;
  --calendar-event-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

  /* Resize handle positioning */
  --calendar-resize-handle-height: 8px;
  --calendar-resize-handle-offset: -4px;

  /* Overlap positioning */
  --calendar-event-min-width: 60px;
  --calendar-event-z-index-base: 20;
}
```

Import the styles in your component or layout:

```tsx
import '@/components/calendar/CalendarEvent.styles.css'
```

## Algorithm Details

The overlap positioning algorithm follows Google Calendar's approach:

1. **Sort Events**: Events are sorted by start time ascending
2. **Find Collision Groups**: Events that overlap in time are grouped together
3. **Assign Columns**: Within each group, events are assigned to the leftmost available column
4. **Calculate Positions**:
   - Width = 100% / maxColumns
   - Left = columnIndex * width
   - Z-index = baseZIndex + columnIndex

This ensures:
- All overlapping events are visible
- Events use available space efficiently
- No events are hidden behind others
- Width adjusts dynamically based on overlap count

## Migration Guide

### From DragAndDropEvent

```tsx
// Before
<DragAndDropEvent
  event={event}
  currentDate={dateStr}
  currentHour={hour}
  onClick={handleClick}
/>

// After
<CalendarEvent
  event={event}
  viewMode="day"
  position={calculateEventPositions([event]).get(event.id)}
  onClick={handleClick}
/>
```

### From ContinuousEventBlock

```tsx
// Before
<ContinuousEventBlock
  event={event}
  startHour={hour}
  durationHours={duration / 60}
  pixelsPerHour={80}
  onEventClick={handleClick}
/>

// After
<CalendarEvent
  event={event}
  viewMode="day"
  pixelsPerHour={80}
  onClick={handleClick}
/>
```

## Future Enhancements

The system is prepared for:

1. **Resize Handles**: Visual handles and CSS classes are in place
2. **Drag-and-Drop**: Handle structure supports future DnD implementation
3. **Advanced Conflict Resolution**: Conflict data structure supports multiple resolution strategies
4. **Touch Gestures**: Mobile-friendly event interactions

## Performance Considerations

- Event position calculations are memoized where possible
- Collision detection uses efficient time-based filtering
- CSS custom properties avoid repeated inline style calculations
- Overlap algorithm is O(n log n) for sorting + O(n²) worst case for collision detection
