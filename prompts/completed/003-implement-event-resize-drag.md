<objective>
Implement unified, smooth event resize and drag functionality across all calendar views (Day, Week, Month, Year) using Framer Motion for animations and proper handle placement.

This creates a consistent, polished interaction model where:
- **Resize**: Handles at top/bottom (Day/Week) or edges (Week multi-day) to change duration
- **Drag**: Center area moves events to new time slots or days
- **Animations**: Smooth, responsive feedback using Framer Motion
</objective>

<context>
Prerequisites: Run prompts 001 and 002 first.

Tech stack:
- React 19, TypeScript, Next.js 15
- Framer Motion (installed) - use for all animations
- react-rnd (installed) - can enhance or replace as needed
- Existing hooks: useEventResize.ts, useEventMutation.ts

The goal is a Google Calendar-like interaction experience with smooth animations.
</context>

<requirements>

## Day View
1. **Resize Handles**
   - Top handle: drag up/down to change start time
   - Bottom handle: drag up/down to change end time
   - Handles should be subtle but discoverable (visible on hover)
   - Minimum event duration: 15 minutes

2. **Drag to Move**
   - Dragging from center (not handles) moves entire event
   - Snap to 15-minute increments
   - Visual feedback: ghost/shadow of original position
   - Smooth animation to new position on drop

3. **Visual Style**
   - Uniform event styling (consistent colors, borders, shadows)
   - Active drag/resize state should be visually distinct
   - Cursor changes: grab → grabbing, resize cursors on handles

## Week View
1. **Single-Day Events**
   - Same resize/drag as Day View within each day column

2. **Multi-Day Resize** (NEW)
   - Left edge handle: extend/shrink to earlier days
   - Right edge handle: extend/shrink to later days
   - Event spans across day columns visually

3. **Cross-Day Drag**
   - Drag event from one day column to another
   - Maintain duration when moving between days

## Month View
1. **Event Display**
   - Events fill entire cell width
   - Stack vertically when multiple events
   - Show "+N more" when events overflow cell height
   - Clicking "+N more" expands or shows popover

2. **Drag to Move**
   - Drag event from center to move to different day
   - No resize in month view (dates only, no times)
   - Visual feedback during drag

## Year View
1. **Event Indicators**
   - Show dot/marker on days with events
   - If space permits: show tally count (e.g., "3")
   - Fallback: simple colored dot indicator
   - Hover to see event summary tooltip

2. **Interaction**
   - Click day to navigate to day view
   - No drag/resize in year view

</requirements>

<implementation>

## Shared Event Component Architecture
Create a unified event component that adapts to view context:

```typescript
// src/components/calendar/UnifiedEvent.tsx
interface UnifiedEventProps {
  event: CalendarEvent;
  view: 'day' | 'week' | 'month' | 'year';
  onResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onDrag?: (eventId: string, newStart: Date) => void;
  onClick?: (event: CalendarEvent) => void;
}
```

## Framer Motion Patterns

```typescript
// Drag configuration
<motion.div
  drag={view !== 'year'}
  dragConstraints={containerRef}
  dragElastic={0.1}
  dragMomentum={false}
  onDragStart={() => setIsDragging(true)}
  onDragEnd={(_, info) => handleDragEnd(info)}
  whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
  layout
  layoutId={`event-${event.id}`}
/>

// Resize handle
<motion.div
  className="resize-handle resize-handle-bottom"
  drag="y"
  dragConstraints={{ top: minHeight, bottom: maxHeight }}
  onDrag={(_, info) => handleResize('bottom', info)}
  whileHover={{ scale: 1.2, backgroundColor: "var(--accent)" }}
/>
```

## Handle Hit Zones
- Handle hit zone: 8-12px from edge
- Center drag zone: everything else
- Use pointer-events and z-index to ensure proper hit detection

## State Management
- Optimistic updates during drag/resize
- Debounced API calls on drop
- Rollback on API failure with toast notification

</implementation>

<output>
Create/modify files:
- `./src/components/calendar/UnifiedEvent.tsx` - New unified event component
- `./src/components/calendar/ResizeHandle.tsx` - Reusable resize handle
- `./src/components/calendar/EventStack.tsx` - Month view stacking logic
- `./src/components/calendar/YearDayIndicator.tsx` - Year view day markers
- `./src/components/DailyPlanner.tsx` - Integrate UnifiedEvent
- `./src/components/WeekView.tsx` - Integrate UnifiedEvent, add multi-day resize
- `./src/components/YearView.tsx` - Add event indicators
- `./src/hooks/useEventResize.ts` - Enhance with Framer Motion support
- `./src/hooks/useEventDrag.ts` - New hook for drag logic
- `./src/app/globals.css` - Add cursor and transition styles
</output>

<verification>
Test each view systematically:

**Day View**
- [ ] Resize from top changes start time
- [ ] Resize from bottom changes end time
- [ ] Drag from center moves event
- [ ] Animations are smooth (60fps)
- [ ] Changes persist to database

**Week View**
- [ ] Single-day resize works
- [ ] Multi-day events can be extended across days
- [ ] Drag moves events between days
- [ ] Duration preserved when moving

**Month View**
- [ ] Events fill cell width
- [ ] Multiple events stack properly
- [ ] "+N more" shows when overflow
- [ ] Drag moves to different day

**Year View**
- [ ] Indicators show on days with events
- [ ] Tally or dot displays correctly
- [ ] Click navigates to day view

**General**
- [ ] No janky animations
- [ ] TypeScript compiles without errors
- [ ] Changes sync to database
- [ ] Resize confirmation shows only when participants exist (from prompt 002)
</verification>

<success_criteria>
- Consistent resize/drag UX across all applicable views
- Framer Motion animations are smooth and responsive
- Handle hit zones work correctly (no accidental drags when resizing)
- All changes persist to database
- Visual feedback during interactions is clear
- Month view handles multiple events gracefully
- Year view shows event presence indicators
</success_criteria>
