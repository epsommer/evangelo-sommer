<objective>
Polish the calendar event creation UI by addressing four related issues:

1. **15-minute click precision**: Single clicks on time slots should respect the exact 15-minute interval clicked, not always snap to the :00 mark
2. **Remove debug console logs**: Clean up all console.log statements from calendar/event creation files
3. **Placeholder bounce-back**: Fix the jumpy/bouncy behavior when double-click-dragging to create placeholder events
4. **Drop zone styling**: Simplify drop zone visuals - remove target icon and text, use theme accent color border on hover only

These improvements will create a smoother, cleaner event creation experience.
</objective>

<context>
This is the time-manager calendar application with event creation via double-click-and-hold drag.

Key files involved:
- `src/hooks/useEventCreationDrag.ts` - Drag state management and calculations
- `src/components/calendar/PlaceholderEvent.tsx` - Visual placeholder component
- `src/components/DropZone.tsx` - Drop target component for drag-and-drop
- `src/components/WeekView.tsx` - Week view calendar
- `src/components/UnifiedDailyPlanner.tsx` - Day view calendar
- `src/components/sidebar/EventCreationForm.tsx` - Sidebar form for event creation
- `src/app/time-manager/page.tsx` - Main page coordinating event creation

The user provided extensive console log output showing the current behavior and debug statements that need removal.
</context>

<research>
Before implementing, examine the existing code to understand:

1. **15-minute click issue**:
   - How `handleTimeSlotClick` calculates the clicked time
   - Whether the hour is extracted but minutes are defaulted to :00
   - How `onTimeSlotDoubleClick` handles precise time vs `onTimeSlotClick`

2. **Console logs**:
   - Identify all console.log statements in the calendar-related files
   - Note any console.error or console.warn that should be preserved

3. **Placeholder bounce-back**:
   - How placeholder position is updated during drag
   - Whether there's a race condition between drag state and render
   - Check for conflicting state updates or async issues

4. **Drop zone styling**:
   - Current styling in DropZone.tsx
   - Where the target icon and text are rendered
   - How hover states are currently implemented
</research>

<requirements>

## Issue 1: 15-Minute Click Precision

Currently, clicking at 2:15 PM creates an event starting at 2:00 PM. Fix this so:
- Single clicks on time slots should calculate the exact 15-minute interval from the click Y position
- The pattern should follow: if click is at Y position within the 2:15-2:30 range, set time to 2:15
- This should work consistently across week view and day view

## Issue 2: Remove Debug Console Logs

Remove ALL console.log statements from these files:
- `src/hooks/useEventCreationDrag.ts`
- `src/components/calendar/PlaceholderEvent.tsx`
- `src/components/DropZone.tsx`
- `src/components/WeekView.tsx`
- `src/components/UnifiedDailyPlanner.tsx`
- `src/components/sidebar/EventCreationForm.tsx`
- `src/app/time-manager/page.tsx`
- `src/hooks/useUnifiedEvents.ts`
- Any other files with calendar/event debug logs

Keep console.error and console.warn statements if they indicate actual errors or warnings that should be monitored.

## Issue 3: Placeholder Bounce-Back

The placeholder event block appears "jumpy" during double-click-drag creation. Fix this by:
- Ensuring smooth, continuous position updates without visual jumps
- Checking for conflicting state updates or render cycles
- Using requestAnimationFrame if needed for smoother visual updates
- Avoiding unnecessary re-renders that cause position flickering

## Issue 4: Drop Zone Styling

Simplify drop zone appearance when dragging scheduled events:

Current (to remove):
- Target icon
- "Drop zone" text
- Complex animations

New behavior:
- Drop zones should be invisible by default
- On hover while dragging, show a simple border using the theme's accent color
- No text, no icons, just a clean border highlight
- Animation should be minimal - simple fade-in of the border

Implementation:
- Use CSS variable `var(--accent)` or Tailwind's `border-accent` for the border color
- Remove the Target icon import and rendering
- Remove any drop zone label/text
- Simplify hover transition to just border-color change
</requirements>

<implementation>

### Issue 1 Implementation:
In `handleTimeSlotClick` functions, calculate minutes from click position:
```typescript
// Instead of defaulting to :00
const timeString = `${hour.toString().padStart(2, '0')}:00`

// Calculate actual minutes from click Y position within the hour cell
const minutesFromY = Math.floor((clickY % hourHeight) / (hourHeight / 4)) * 15
const timeString = `${hour.toString().padStart(2, '0')}:${minutesFromY.toString().padStart(2, '0')}`
```

### Issue 2 Implementation:
Use search/replace to remove console.log statements. Be thorough but careful not to remove error logging.

### Issue 3 Implementation:
Check for these common causes of bounce-back:
- State updates in render cycle causing re-renders
- Missing `useMemo` or `useCallback` causing function recreation
- Conflicting position calculations between parent and child components
- CSS transitions interfering with position updates

### Issue 4 Implementation:
In DropZone.tsx:
```tsx
// Remove icon import
// Remove: import { Target } from 'lucide-react'

// Simplify the drop zone render
<div className={`
  h-full w-full
  ${isDragOver ? 'border-2 border-accent' : 'border-transparent'}
  transition-colors duration-150
`}>
  {/* No icon or text - just the border on hover */}
</div>
```
</implementation>

<constraints>
- Do not modify the core event creation logic
- Preserve existing double-click detection behavior
- Keep the 15-minute snap behavior during drag (just fix single-click precision)
- Maintain all existing event types and their handling
- Do not remove console.error or console.warn statements that indicate actual errors
- Keep any production logging that might be needed for debugging issues
</constraints>

<output>
Modify the necessary files to address all four issues:
- `./src/hooks/useEventCreationDrag.ts` - Remove debug logs, fix any bounce-back issues
- `./src/components/DropZone.tsx` - Simplify styling, remove icon/text
- `./src/components/WeekView.tsx` - Remove debug logs, fix click precision
- `./src/components/UnifiedDailyPlanner.tsx` - Remove debug logs, fix click precision
- `./src/components/sidebar/EventCreationForm.tsx` - Remove debug logs
- `./src/app/time-manager/page.tsx` - Remove debug logs, fix click precision if needed
- `./src/hooks/useUnifiedEvents.ts` - Remove debug logs
- Any other files as needed
</output>

<verification>
Before declaring complete:

1. Run `npm run build` to ensure no TypeScript errors

2. Test in the browser:
   - Click on 2:15, 2:30, 2:45 time positions and verify the sidebar form shows correct time
   - Double-click-drag to create placeholder - verify no bounce-back/jumpiness
   - Drag an existing event - verify drop zones show clean accent border on hover only
   - Open browser console - verify no debug log spam during interactions

3. Code review:
   - Confirm all console.log removed from target files
   - Confirm console.error/warn preserved where appropriate
   - Confirm drop zone has no Target icon or text rendering
</verification>

<success_criteria>
- Single clicks on time slots respect the exact 15-minute interval clicked
- No console.log statements in calendar/event files (only error/warn preserved)
- Placeholder creation is smooth without visual jumping or bounce-back
- Drop zones show only a theme-colored border on hover, no icons or text
- No TypeScript errors in build
- All existing functionality preserved
</success_criteria>
