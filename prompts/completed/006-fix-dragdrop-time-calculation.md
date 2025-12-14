<objective>
Fix the time calculation mismatch in Week View drag-and-drop where events jump to incorrect time slots several hours before the intended drop location. The event should land exactly where the user drops it, not at an offset position.
</objective>

<context>
Prerequisites: Prompts 001-005 completed.

Current behavior:
- User drags event from one time slot (e.g., 2:00 PM)
- User drops event on target slot (e.g., 4:00 PM)
- Event appears at wrong time (e.g., 11:00 AM - several slots earlier)
- Database saves the incorrect time
- Consistent offset suggests systematic calculation error

Likely causes:
1. **Timezone mismatch**: UTC vs local time conversion error
2. **Container offset**: Not accounting for scroll position or container bounds
3. **Drop zone calculation**: Incorrect pixel-to-time mapping
4. **Event position**: Using wrong reference point (top vs center of event)

Key files:
- `src/components/DragDropContext.tsx` - Core drag state management
- `src/components/WeekView.tsx` - Drop zone setup and time calculation
- `src/components/DropZone.tsx` - Individual drop target logic
- `src/utils/calendar/` - Time calculation utilities

Tech stack:
- React 19, TypeScript, Next.js 15
- HTML5 Drag and Drop API (native)
- date-fns for date manipulation
</context>

<requirements>

## Problem Analysis
1. Add debug logging to trace:
   - Original event time
   - Drop zone target time
   - Calculated new time
   - Final saved time
2. Identify the exact point where time calculation diverges
3. Determine if offset is constant or variable

## Fix Requirements
1. **Accurate Time Mapping**: Drop position must map to correct time slot
2. **Timezone Consistency**: All calculations in same timezone
3. **Scroll-Aware**: Account for container scroll position
4. **Snap to Grid**: 15-minute increments, nearest slot wins

## Expected Behavior
- Drag event from 2:00 PM on Monday
- Drop on 4:00 PM on Wednesday
- Event appears at 4:00 PM on Wednesday
- Database shows 4:00 PM Wednesday (same timezone as display)

</requirements>

<implementation>

## Debug Investigation
Add comprehensive logging to trace the issue:

```typescript
// In DragDropContext.tsx endDrag
console.log('🎯 [DragDrop] End drag debug:', {
  originalEvent: {
    id: event.id,
    title: event.title,
    startDateTime: event.startDateTime,
    parsedStart: new Date(event.startDateTime).toISOString()
  },
  dropZone: {
    date: dropZoneState.targetDate,
    hour: dropZoneState.targetHour,
    minute: dropZoneState.targetMinute
  },
  calculated: {
    newStartDateTime: calculatedStart,
    newEndDateTime: calculatedEnd
  },
  containerInfo: {
    scrollTop: container?.scrollTop,
    offsetTop: container?.offsetTop,
    clientY: dropEvent.clientY
  }
})
```

## Common Fixes

### Fix 1: Container Scroll Offset
```typescript
// WRONG - ignores scroll
const dropY = e.clientY - containerRect.top

// CORRECT - accounts for scroll
const dropY = e.clientY - containerRect.top + container.scrollTop
```

### Fix 2: Timezone Normalization
```typescript
// WRONG - mixing timezone representations
const newStart = new Date(`${dropDate}T${dropHour}:00:00`)

// CORRECT - explicit timezone handling
const newStart = new Date(`${dropDate}T${dropHour}:00:00`)
// Then format consistently:
const isoString = format(newStart, "yyyy-MM-dd'T'HH:mm:ss")
```

### Fix 3: Drop Zone Registration
Ensure drop zones register their exact time slot:
```typescript
// In DropZone component
const registerDropZone = () => ({
  date: format(date, 'yyyy-MM-dd'),
  hour: hour,
  minute: slotMinute, // 0, 15, 30, or 45
  // Include position for debugging
  rect: element.getBoundingClientRect()
})
```

### Fix 4: Event Center vs Top
```typescript
// If using event center for positioning, adjust calculation:
const eventCenterOffset = eventHeight / 2
const adjustedDropY = dropY - eventCenterOffset
```

## Time Calculation Verification
```typescript
const calculateNewEventTime = (
  dropDate: string,
  dropHour: number,
  dropMinute: number,
  eventDuration: number
) => {
  // Parse drop target
  const targetDate = parseISO(dropDate)
  const newStart = setMinutes(setHours(targetDate, dropHour), dropMinute)
  const newEnd = addMinutes(newStart, eventDuration)

  console.log('🕐 Time calculation:', {
    dropDate,
    dropHour,
    dropMinute,
    newStart: format(newStart, 'yyyy-MM-dd HH:mm'),
    newEnd: format(newEnd, 'yyyy-MM-dd HH:mm'),
    duration: eventDuration
  })

  return { newStart, newEnd }
}
```

</implementation>

<output>
Modify files:
- `src/components/DragDropContext.tsx` - Fix time calculation in endDrag
- `src/components/WeekView.tsx` - Ensure drop zones pass correct time data
- `src/components/DropZone.tsx` - Verify time slot registration accuracy
- `src/utils/calendar/dragCalculations.ts` - Create/fix time mapping utilities
</output>

<verification>
Test drag-drop accuracy:

**Basic Drop Tests**
- [ ] Drag event from 9:00 AM, drop on 2:00 PM - lands at 2:00 PM
- [ ] Drag event from 2:00 PM, drop on 9:00 AM - lands at 9:00 AM
- [ ] Drag event, drop on same slot - stays in place

**Cross-Day Tests**
- [ ] Drag Monday 10:00 AM to Wednesday 3:00 PM - correct day and time
- [ ] Drag Friday to Monday - correct day and time

**Edge Cases**
- [ ] Drop on 11:45 PM - doesn't overflow to next day incorrectly
- [ ] Drop on 12:00 AM - lands at midnight, not noon
- [ ] Multi-hour event - preserves duration when moved

**Scroll Tests**
- [ ] Scroll down, drag event - lands at correct scrolled position
- [ ] Scroll to different week, drag - correct calculation

**Console Verification**
- [ ] Debug logs show matching drop target and calculated time
- [ ] No timezone offset in logs
</verification>

<success_criteria>
- Events land exactly where user drops them
- Time calculation matches visual drop target
- No systematic offset in any direction
- Works correctly when container is scrolled
- Cross-day drops work accurately
- TypeScript compiles without errors
</success_criteria>
