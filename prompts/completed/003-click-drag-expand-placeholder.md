<objective>
Implement click-and-drag functionality on the second click of a double-click to dynamically resize the placeholder event box.

When the user double-clicks and holds on the second click, dragging the mouse should expand the placeholder event box to cover the duration from the initial click position to the current mouse position. The mouse position maps to day columns (horizontal) and time rows (vertical).
</objective>

<context>
This is the Becky CRM/Time Manager application built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

Key files to examine:
- `src/components/WeekView.tsx` - Calendar grid, uses 80px per hour
- `src/components/DropZone.tsx` - Time slot click handling
- `src/hooks/useEventResize.ts` - Existing resize logic (can reference patterns)
- `src/utils/calendar/resizeCalculations.ts` - Time/position calculation utilities

Grid structure:
- 7 day columns (index 0-6 for Sun-Sat)
- 24 hour rows (index 0-23 for hours)
- Each hour row is 80px tall
- Grid uses `grid-cols-8` (1 time column + 7 day columns)

This prompt DEPENDS on prompts 001 and 002 being implemented first (double-click detection and placeholder visual).
</context>

<requirements>
1. Detect drag-on-double-click pattern
   - Track when mousedown occurs during a double-click sequence
   - If user holds mouse down after second click, enter drag mode
   - Track mouse movement during drag
   - End drag on mouseup

2. Calculate time/duration from mouse position
   - Vertical movement: Calculate hours/minutes from Y position relative to grid
   - Horizontal movement: Calculate day change from X position (column index)
   - Snap to 15-minute increments for precision
   - Support both expanding (drag down/forward) and contracting (drag up/backward)

3. Update placeholder during drag
   - Real-time visual feedback as user drags
   - Placeholder height changes based on duration
   - If multi-day drag detected, update placeholder width to span columns
   - Show live time range in placeholder (e.g., "9:00 AM - 2:30 PM")

4. Sync final duration with sidebar form
   - When drag ends, update the duration field in the sidebar form
   - Update start/end time fields based on drag result
   - If multi-day, set appropriate start/end dates

5. Constraints
   - Minimum duration: 15 minutes
   - Maximum duration: Can span multiple days if dragged horizontally
   - Start time cannot be after end time (swap if dragged backwards)
</requirements>

<implementation>
Mouse event flow:
1. First click of double-click sequence
2. Second click (mousedown) - start tracking
3. If mouseup happens quickly (< 200ms) - treat as regular double-click
4. If mouse moves while held - enter drag mode
5. During drag: calculate position, update placeholder in real-time
6. On mouseup: finalize duration, update sidebar form

Position calculation:
```typescript
interface DragState {
  isDragging: boolean;
  startDate: string;
  startHour: number;
  startMinutes: number;
  currentDate: string;
  currentHour: number;
  currentMinutes: number;
}

// Convert Y position to hour/minutes
const yToTime = (y: number, gridTop: number, pixelsPerHour: number) => {
  const relativeY = y - gridTop;
  const totalMinutes = (relativeY / pixelsPerHour) * 60;
  const hour = Math.floor(totalMinutes / 60);
  const minutes = Math.round((totalMinutes % 60) / 15) * 15; // Snap to 15min
  return { hour, minutes };
}

// Convert X position to day column
const xToDay = (x: number, gridLeft: number, columnWidth: number) => {
  const relativeX = x - gridLeft - timeColumnWidth;
  const dayIndex = Math.floor(relativeX / columnWidth);
  return Math.max(0, Math.min(6, dayIndex)); // Clamp to 0-6
}
```

Visual feedback during drag:
- Placeholder grows/shrinks smoothly
- Show a subtle animation or glow effect
- Display duration text (e.g., "1h 30m")

Why this UX pattern: This mimics Google Calendar and other popular calendar apps where users can click-drag to quickly create events of specific durations without manually entering times.
</implementation>

<output>
Create:
- `src/hooks/useEventCreationDrag.ts` - Hook for drag detection and position calculation

Modify:
- `src/components/DropZone.tsx` - Add mousedown tracking for drag initiation
- `src/components/WeekView.tsx` - Handle drag state and coordinate with placeholder
- `src/components/calendar/PlaceholderEvent.tsx` - Support dynamic sizing during drag
- Parent component - Pass drag state changes to sidebar form
</output>

<verification>
Before declaring complete:
1. Double-click and hold on a time slot
2. Drag downward and verify placeholder expands
3. Drag upward and verify placeholder contracts (minimum 15 min)
4. Release mouse and verify duration is set in sidebar form
5. Drag across multiple days (horizontal) and verify multi-day event creation
6. Verify 15-minute snap increments work correctly
7. Verify start/end times update correctly in sidebar form
</verification>

<success_criteria>
- Click-drag on second click initiates dynamic event sizing
- Placeholder resizes in real-time following mouse position
- Duration snaps to 15-minute increments
- Multi-day events can be created by dragging horizontally
- Final duration is correctly synced to sidebar form fields
- Smooth visual feedback during drag operation
</success_criteria>
