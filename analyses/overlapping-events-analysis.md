# Overlapping Events Analysis: Time Manager Calendar UI

**Date:** December 23, 2025
**Scope:** Analysis of current overlapping event implementation vs. industry standards (Google Calendar, Apple Calendar, Notion Calendar)

---

## Executive Summary

The Time Manager calendar currently has **sophisticated overlap detection and positioning logic** implemented for Day/Week views via `eventOverlap.ts`, but this is **not consistently applied** across all calendar views. Month view lacks visual overlap handling entirely, relying on basic stacking that can obscure events. Multi-day events span correctly but don't utilize the overlap algorithm.

### Top 3 Recommendations

1. **Apply the existing column-based overlap algorithm** from `eventOverlap.ts` to WeekView and DayView components (currently detected but not visually applied in CalendarEvent rendering)
2. **Implement "+N more" indicators** in Month view when events exceed available vertical space (3-4 events per day cell)
3. **Add visual hierarchy for multi-day vs. single-day events** using z-index layering and subtle opacity differences

---

## Current Implementation Analysis

### Day View (`UnifiedDailyPlanner.tsx`)

**What Works:**
- Fixed-height time slots (50px per hour) provide consistent grid
- Events positioned absolutely over grid using `getEventStyle()`
- Vertical positioning calculates precise top/height based on time and duration
- Multi-day visual duration calculation (time-of-day span) works correctly
- CalendarEvent component renders with resize handles and drag support

**What's Missing:**
- **No horizontal overlap handling** - events render at full width (left: 0, right: 0)
- No collision detection applied to filter/group overlapping events
- Multiple events at same time will completely overlap each other
- No visual indication when events are obscured

**Current Code:**
```typescript
const getEventStyle = (event: UnifiedEvent): React.CSSProperties => {
  // ... vertical positioning logic
  return {
    position: 'absolute',
    top: `${top}px`,
    height: `${Math.max(height, 25)}px`,
    left: 0,        // ← Full width, no overlap handling
    right: 0,       // ← Full width, no overlap handling
    zIndex: 10
  }
}
```

### Week View (`WeekView.tsx`)

**What Works:**
- Grid-based layout with 8 columns (1 time + 7 days)
- Multi-day events span across columns using percentage-based positioning
- Single-day and multi-day events rendered separately with distinct overlays
- Resize preview for multi-day corner resize with visual feedback
- Drag ghost preview shows target position during drag

**What's Missing:**
- **Overlap algorithm exists but not applied** - `calculateEventPositions()` from `eventOverlap.ts` is imported but never used
- Events render at full column width (left: '2px', right: '2px')
- Multiple events in same time slot will stack on top of each other
- No visual indication of hidden/obscured events

**Current Code:**
```typescript
// getEventStyle returns full width positioning
const getEventStyle = (event: UnifiedEvent): React.CSSProperties => {
  return {
    position: 'absolute',
    top: `${top}px`,
    height: `${Math.max(height, 25)}px`,
    left: '2px',    // ← Full width
    right: '2px',   // ← Full width
    zIndex: 10
  }
}

// Overlap detection exists in eventOverlap.ts but isn't used:
// - findCollisionGroups() - groups overlapping events
// - assignColumns() - calculates side-by-side positioning
// - calculateEventPositions() - returns Map<eventId, EventPosition>
```

### Month View (`ScheduleCalendar.tsx`)

**What Works:**
- Multi-day events span across days within week rows using percentage-based positioning
- Consecutive daily recurring events merged and displayed as multi-day spans
- Single-day events filtered separately from multi-day events
- Ghost preview during drag shows multi-day span

**What's Missing:**
- **No overlap handling at all** - events stack vertically with no limit
- **No "+N more" indicator** - all events render, causing cell overflow
- Events beyond 3-4 will extend beyond cell boundaries
- No click to expand/collapse overflow events
- No density control or event count limiting

**Current Code:**
```typescript
// Single-day events render in a simple map with no overflow handling
{getSingleDayEventsForDate(day, weekStart, weekEnd).map((event) => (
  <CalendarEvent
    key={event.id}
    event={event as UnifiedEvent}
    viewMode="month"
    isCompact={true}
    // No positioning, no overflow detection
  />
))}
```

---

## Existing Overlap Detection Infrastructure

### `eventOverlap.ts` - Column-Based Algorithm

**Status:** Implemented but underutilized

**What It Provides:**
```typescript
interface EventPosition {
  event: UnifiedEvent
  column: number        // 0-based column index
  maxColumns: number    // Total columns needed
  width: number         // Percentage width (e.g., 50 for 2 columns)
  left: number          // Percentage offset (e.g., 0, 50 for 2 columns)
  zIndex: number        // Layering (20 + column)
}

// Main functions:
- eventsOverlap(event1, event2): boolean
- findCollisionGroups(events): CollisionGroup[]
- assignColumns(group): Map<eventId, EventPosition>
- calculateEventPositions(events): Map<eventId, EventPosition>
```

**Algorithm Details (Google Calendar-inspired):**
1. Sort events by start time
2. Group overlapping events into collision groups
3. Within each group, assign events to leftmost available column
4. Calculate width = 100 / maxColumns, left = column * width
5. Apply higher z-index to rightmost columns

**Example Output:**
```typescript
// 3 overlapping events:
Event A: { column: 0, maxColumns: 3, width: 33.33, left: 0, zIndex: 20 }
Event B: { column: 1, maxColumns: 3, width: 33.33, left: 33.33, zIndex: 21 }
Event C: { column: 2, maxColumns: 3, width: 33.33, left: 66.66, zIndex: 22 }
```

### `conflict-detector.ts` - Comprehensive Conflict Analysis

**Status:** Implemented and used for validation, not visual display

**What It Provides:**
- Temporal overlap detection with precise time calculations
- Buffer violation detection (30-min default)
- Resource conflicts (same client/location)
- Business rule violations (work hours, blackout periods)
- Resolution suggestions with alternative time slots

**Not Used For:**
- Visual positioning of overlapping events
- UI layout calculations

---

## Industry Comparison

### Google Calendar

**Day/Week View - Overlapping Timed Events:**
- Side-by-side column layout
- Events divided into equal-width columns based on max concurrent events
- Leftmost placement prioritized (events assigned to leftmost available column)
- Rightmost events have higher z-index for accessibility
- Visual algorithm matches `eventOverlap.ts` implementation

**Month View - Multi-Day Events:**
- Horizontal bars spanning multiple days
- Events stacked vertically within each week row
- "+N more" indicator appears when >3-4 events in a day
- Click "+N more" to expand inline or open day view

**Month View - All-Day Events:**
- Rendered above timed events in dedicated all-day section
- Light background color differentiation

**References:**
- [Google Calendar overlapping events discussion](https://support.google.com/calendar/thread/203429627/google-calendar-display-of-overlapping-events?hl=en)
- [Side-by-side vs overlapping](https://support.google.com/calendar/thread/137931023/changing-side-by-side-into-overlaying-events?hl=en)

### Apple Calendar

**Day/Week View - Overlapping Timed Events:**
- Similar side-by-side layout to Google Calendar
- Slight visual overlap at boundaries for continuity
- Command+click (macOS) to bring obscured event forward
- Tap to bring event forward (iOS)

**Location-Aware Stacking:**
- Events with locations stagger to show potential travel time conflicts
- Visual cue for commute time between events

**iOS 18+ Issues:**
- Random staggering of non-overlapping events reported
- Inconsistent behavior between same/different calendars

**Month View:**
- Long events shown as horizontal bars
- Shorter events shown with time + title
- Stacked vertically within cells

**References:**
- [Apple Calendar overlapping events](https://discussions.apple.com/thread/254313739)
- [Calendar stacking organization](https://discussions.apple.com/thread/255824078)

### Notion Calendar

**Multi-Day Events:**
- Database calendar view supports multi-date event spans
- Drag edges to extend event across multiple days
- Rendered as continuous horizontal blocks in month view

**Timeline View:**
- Alternative to traditional calendar for long-running projects
- Gantt-style visualization for multi-month events

**Limitations:**
- Recurring events don't span multiple days (lacks RRULE support)
- Google Calendar integration shows proper recurring spans

**References:**
- [Notion Calendar multi-day events](https://www.notion.com/help/calendars)
- [Managing multi-date events in Notion](https://uno.notion.vip/managing-multi-date-calendar-events-in-notion/)
- [Multi-date calendar events guide](https://createwithnotion.com/managing-multi-date-calendar-events-in-notion/)

---

## Industry Patterns Comparison Table

| Pattern | Google Calendar | Apple Calendar | Notion Calendar | Current Implementation |
|---------|----------------|----------------|-----------------|------------------------|
| **Day/Week: Overlapping Timed Events** | Side-by-side columns, equal width division | Side-by-side columns, slight overlap at edges | Not applicable (database view) | **Detected but not applied** - algorithm exists in `eventOverlap.ts` |
| **Day/Week: Visual Hierarchy** | Rightmost has highest z-index | Tap/Command+click to bring forward | N/A | Static z-index (10, 20) |
| **Month: Multi-Day Spanning** | Horizontal bars across week rows | Horizontal bars | Drag to extend across days | **Implemented** - percentage-based positioning |
| **Month: All-Day Events** | Dedicated all-day section above | Mixed with timed events | Property-based filtering | Mixed with timed events |
| **Month: "+N More" Indicator** | Shows when >3-4 events/day, click to expand | Similar overflow handling | Event count badge | **Missing** - no overflow handling |
| **Month: Event Density Control** | Limits visible events per cell | Limits visible events per cell | Database pagination | **Missing** - all events render |
| **Interaction: Obscured Events** | Click to select, layers visible | Command+click to bring forward | Database search/filter | **No interaction** - events overlap completely |
| **Recurring Events** | RRULE support, visual instances | RRULE support | No native RRULE (requires Google sync) | **Implemented** - `recurrence` property with frequency/interval |
| **Location Awareness** | No staggering | Location-based staggering (iOS) | Not applicable | Not applicable |

---

## Recommendations

### Day/Week View Recommendations

#### 1. Apply Existing Overlap Algorithm (HIGH PRIORITY)

**Implementation:**
```typescript
// In UnifiedDailyPlanner.tsx and WeekView.tsx

import { calculateEventPositions } from '@/utils/calendar/eventOverlap'

// Calculate positions for all events in the day/column
const eventPositions = useMemo(() => {
  return calculateEventPositions(filteredEvents)
}, [filteredEvents])

// Update getEventStyle to use calculated position
const getEventStyle = (event: UnifiedEvent): React.CSSProperties => {
  const position = eventPositions.get(event.id)

  return {
    position: 'absolute',
    top: `${top}px`,
    height: `${Math.max(height, 25)}px`,
    // Apply overlap positioning
    left: position ? `${position.left}%` : 0,
    width: position ? `${position.width}%` : '100%',
    zIndex: position ? position.zIndex : 10
  }
}
```

**Impact:** Eliminates complete overlap, improves event visibility, matches Google/Apple UX

#### 2. Visual Hierarchy Enhancement (MEDIUM PRIORITY)

**Pattern:** Rightmost events should be easiest to access

**Implementation:**
- Apply z-index from overlap calculation (already in EventPosition)
- Add subtle box-shadow on hover to lift event visually
- Consider slight opacity reduction (90%) for background columns

**Interaction Pattern:**
- Click any visible portion of event to bring to front (temp z-index boost)
- Or follow Apple pattern: Command+click to cycle through stack

#### 3. Collision Visual Feedback (LOW PRIORITY)

**Current State:** ConflictDetector exists but only used for validation

**Enhancement:**
- Add visual indicator (border color, icon) for events with detected conflicts
- Show conflict count badge on overlapping events
- Distinguish between temporal overlap (expected) vs. conflict (validation error)

### Month View Recommendations

#### 1. "+N More" Indicator (HIGH PRIORITY)

**Pattern:** Limit visible events per day cell to 3-4, show indicator for overflow

**Implementation:**
```typescript
// In ScheduleCalendar.tsx

const MAX_VISIBLE_EVENTS_PER_DAY = 3

const renderDayEvents = (day: Date) => {
  const dayEvents = getSingleDayEventsForDate(day)
  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS_PER_DAY)
  const hiddenCount = Math.max(0, dayEvents.length - MAX_VISIBLE_EVENTS_PER_DAY)

  return (
    <>
      {visibleEvents.map(event => (
        <CalendarEvent key={event.id} event={event} isCompact={true} />
      ))}
      {hiddenCount > 0 && (
        <button
          className="text-xs text-accent hover:underline"
          onClick={() => handleShowMoreEvents(day)}
        >
          +{hiddenCount} more
        </button>
      )}
    </>
  )
}
```

**Interaction Options:**
- Click "+N more" to expand cell inline (show all events)
- Click "+N more" to open day view for that date
- Click "+N more" to show modal with all events

**Recommended:** Open day view (matches Google Calendar)

#### 2. Multi-Day Event Visual Hierarchy (MEDIUM PRIORITY)

**Current State:** Multi-day events render at same z-index as single-day events

**Enhancement:**
```typescript
// Multi-day events should render above single-day events
const getMultiDayEventStyle = (...) => {
  return {
    // ... existing positioning
    zIndex: 30, // Higher than single-day events (10)
    opacity: 0.95 // Slight transparency to show layering
  }
}
```

**Additional:**
- Add subtle gradient or border to indicate span direction
- Show event count badge on first day cell

#### 3. All-Day Event Section (LOW PRIORITY)

**Pattern:** Dedicated row at top of each week for all-day events

**Current State:** All-day events mixed with timed events

**Enhancement:**
- Add all-day section above each week row
- Render `isAllDay` events in this section
- Limit height to 2-3 events, collapse with "+N more"

**Complexity:** Requires significant layout restructuring

---

## Implementation Priority

### Phase 1: High Impact, Low Effort
**Timeline:** 1-2 days

1. **Apply overlap algorithm to Day/Week views**
   - Import `calculateEventPositions` from `eventOverlap.ts`
   - Update `getEventStyle()` to use calculated positions
   - Test with 2-5 overlapping events per time slot
   - **Files:** `UnifiedDailyPlanner.tsx`, `WeekView.tsx`
   - **Complexity:** Low (algorithm exists, just needs integration)

2. **Add "+N more" indicator to Month view**
   - Limit visible events to 3 per day cell
   - Add overflow indicator button
   - Wire to day view navigation
   - **Files:** `ScheduleCalendar.tsx`
   - **Complexity:** Low (simple slice + button)

### Phase 2: Enhanced Visuals
**Timeline:** 2-3 days

3. **Visual hierarchy for overlapping events**
   - Apply calculated z-index from EventPosition
   - Add hover effects to lift events
   - Add click-to-bring-forward interaction
   - **Files:** `CalendarEvent.tsx`
   - **Complexity:** Medium (requires interaction state management)

4. **Multi-day event z-index layering**
   - Increase z-index for multi-day events in month view
   - Add transparency to show layering
   - **Files:** `ScheduleCalendar.tsx`
   - **Complexity:** Low (CSS changes)

### Phase 3: Advanced Features
**Timeline:** 3-5 days

5. **All-day event section in Month view**
   - Create dedicated all-day row per week
   - Filter `isAllDay` events to this section
   - Add collapse/expand for overflow
   - **Files:** `ScheduleCalendar.tsx`
   - **Complexity:** High (layout restructure)

6. **Conflict visual indicators**
   - Integrate ConflictDetector results into CalendarEvent
   - Add visual markers (border, badge, icon)
   - Distinguish overlap (expected) vs. conflict (error)
   - **Files:** `CalendarEvent.tsx`, `ConflictResolutionModal.tsx`
   - **Complexity:** Medium (requires conflict state propagation)

---

## Technical Considerations

### Performance
- `calculateEventPositions()` runs in O(n²) for collision detection
- Acceptable for typical calendar views (<100 events visible)
- Consider memoization for large datasets
- Current implementation already uses `useMemo` for filtered events

### Accessibility
- Ensure overlapping events are keyboard-navigable
- Add ARIA labels for "+N more" indicators
- Provide screen reader feedback for hidden events
- Test with keyboard-only navigation

### Mobile Responsiveness
- Overlap columns become very narrow on mobile (<120px screen width)
- Consider stacking instead of side-by-side on small screens
- "+N more" pattern already mobile-friendly

### Edge Cases
- All-day multi-day events spanning weeks (current implementation handles this)
- Recurring events with exceptions (currently supported via `recurrence` property)
- Events at midnight boundary (existing time calculation handles this)
- Maximum columns (current algorithm has no limit, consider capping at 5-6)

---

## Conclusion

The Time Manager calendar has **excellent foundation** with:
- Sophisticated overlap detection algorithm in `eventOverlap.ts`
- Comprehensive conflict detection in `conflict-detector.ts`
- Solid multi-day event spanning in all views
- Proper time-based positioning with 15-minute precision

**Primary gap:** Visual application of existing overlap logic

**Recommended approach:**
1. Start with Phase 1 (overlap algorithm + "+N more") for immediate impact
2. Iterate on visual hierarchy (Phase 2) based on user feedback
3. Defer all-day section (Phase 3) until user demand is clear

**Expected outcome:** Calendar UX will match or exceed Google/Apple Calendar for overlapping event display while maintaining existing advanced features (multi-day, recurring, conflict detection).

---

## Appendices

### A. Code References

**Overlap Detection:**
- `/src/utils/calendar/eventOverlap.ts` - Column-based positioning algorithm
- `/src/lib/conflict-detector.ts` - Comprehensive conflict validation

**Calendar Views:**
- `/src/components/UnifiedDailyPlanner.tsx` - Day view (line 429: getEventStyle)
- `/src/components/WeekView.tsx` - Week view (line 700: getEventStyle, line 625: getMultiDayEventStyle)
- `/src/components/ScheduleCalendar.tsx` - Month view (line 359: getSingleDayEventsForDate)

**Event Rendering:**
- `/src/components/calendar/CalendarEvent.tsx` - Unified event component with drag/resize

### B. Research Sources

**Google Calendar:**
- [Overlapping events display](https://support.google.com/calendar/thread/203429627/google-calendar-display-of-overlapping-events?hl=en)
- [Side-by-side vs overlaying](https://support.google.com/calendar/thread/137931023/changing-side-by-side-into-overlaying-events?hl=en)
- [Short non-conflicting events](https://karenapp.io/books/gc/google-calendar-events/how-to-make-google-calendar-show-short-non-conflicting-events-as-non-overlapping/)

**Apple Calendar:**
- [Overlapping events resolution](https://discussions.apple.com/thread/254313739)
- [Calendar stacking organization](https://discussions.apple.com/thread/255824078)
- [Side-by-side display](https://discussions.apple.com/thread/254300405)

**Notion Calendar:**
- [Calendar view documentation](https://www.notion.com/help/calendars)
- [Managing multi-date events](https://uno.notion.vip/managing-multi-date-calendar-events-in-notion/)
- [Multi-date calendar events guide](https://createwithnotion.com/managing-multi-date-calendar-events-in-notion/)
- [Timeline view](https://www.notion.com/help/timelines)

---

**Analysis completed:** December 23, 2025
**Next steps:** Review with team, prioritize Phase 1 implementation
