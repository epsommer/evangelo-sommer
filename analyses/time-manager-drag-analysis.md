# Time Manager Drag-and-Drop Analysis: Web vs Mobile

**Date:** 2025-12-19
**Analyst:** Claude Opus 4.5
**Purpose:** Comprehensive behavioral mapping between web mouse events and mobile touch equivalents for time manager drag-and-drop functionality

---

## Executive Summary

This analysis provides a detailed comparison of drag-and-drop placeholder styles, actions, and visual effects between the Becky CRM web application and mobile app. The web version uses HTML5 drag-and-drop with mouse events, while the mobile version uses React Native's PanResponder for touch gestures. Both implementations share similar UX patterns with platform-specific optimizations.

### Key Findings

1. **Web Implementation**: Uses native HTML drag-and-drop with custom visual feedback via placeholder components
2. **Mobile Implementation**: Uses PanResponder with 60fps animations and optimistic updates
3. **Shared Patterns**: 15-minute snapping, visual placeholder during creation, resize handles, multi-day support
4. **Platform Differences**: Web uses CSS transforms; mobile uses Animated API for performance

---

## Web Implementation Details

### Component Structure

```
TimeManagerPage (root)
├── CalendarLayout (sidebar + main content wrapper)
│   ├── EventCreationForm (sidebar form with live placeholder sync)
│   └── WeekView / UnifiedDailyPlanner (calendar grid)
│       ├── DropZone (drop targets for each hour/day)
│       ├── CalendarEvent (draggable event blocks)
│       ├── PlaceholderEvent (ghost preview during creation)
│       └── DragGhostPreview (preview during event drag)
├── DragDropContext (global drag state provider)
└── useEventCreationDrag (hook for click-drag event creation)
```

### Drag-and-Drop Library

**Library:** Custom implementation (no third-party library)

**Core Technologies:**
- HTML5 native drag-and-drop API (`onDragStart`, `onDragOver`, `onDrop`)
- React context for global drag state management
- Custom hooks for event creation drag (`useEventCreationDrag`)
- PanResponder-style approach via mouse events for event creation

**Version:** Custom (built-in React)

### Event Handlers

#### 1. Event Creation (Double-Click + Drag)

**File:** `/web/evangelo-sommer/src/hooks/useEventCreationDrag.ts`

**Event Flow:**
```javascript
handleMouseDown (double-click detection)
  → handleMouseMove (track drag, snap to 15-min intervals)
    → handleMouseUp (finalize placeholder)
      → onPlaceholderChange (update sidebar form)
```

**State Tracked:**
```typescript
interface DragState {
  isDragging: boolean
  startDate: string        // 'yyyy-MM-dd'
  startHour: number        // 0-23
  startMinutes: number     // 0-59
  currentDate: string      // for multi-day
  currentHour: number
  currentMinutes: number
  duration: number         // in minutes
  isMultiDay: boolean
  startDayIndex: number    // 0-6 for week view
  currentDayIndex: number
}
```

**Key Features:**
- Double-click threshold: 300ms window
- Drag threshold: 5px minimum movement
- Snap interval: 15 minutes
- Minimum duration: 15 minutes
- Real-time placeholder updates during drag

#### 2. Event Drag-and-Drop (Moving Events)

**File:** `/web/evangelo-sommer/src/components/DragDropContext.tsx`

**Event Flow:**
```javascript
CalendarEvent (draggable=true)
  → onDragStart (capture event, show drop zones)
    → DropZone.onDragOver (highlight valid drop targets)
      → DropZone.onDrop (calculate new time, update event)
        → onEventDrop callback (persist to backend)
```

**State Tracked:**
```typescript
interface DragState {
  isDragging: boolean
  draggedEvent: UnifiedEvent | null
  dragOffset: { x: number; y: number }
  originalSlot: { date: string; hour: number; minute?: number }
}

interface DropZoneState {
  activeDropZone: { date: string; hour: number; minute?: number } | null
  hoveredDropZone: { date: string; hour: number; minute?: number } | null
}
```

**Visual Feedback:**
- Dragged event: `opacity: 0.5`, `cursor: grabbing`
- Valid drop zone: `bg-accent/15`
- Invalid drop zone: `bg-red-400/15`
- Ghost preview: Dashed border, accent color, shows title + time

#### 3. Event Resize

**File:** `/web/evangelo-sommer/src/hooks/useEventResize.ts`

**Event Flow:**
```javascript
ResizeHandle (top/bottom/corner)
  → onMouseDown (start resize)
    → onMouseMove (update preview with constraints)
      → onMouseUp (finalize resize, update event)
```

**Resize Handles:**
- **Top handle**: Adjusts start time
- **Bottom handle**: Adjusts end time
- **Corner handles (week view)**: Multi-day resize
  - top-left, top-right, bottom-left, bottom-right

**Constraints:**
- Minimum duration: 15 minutes
- Snap to: 15-minute intervals
- Prevent extending past midnight (same-day events)

### Placeholder Styles

**File:** `/web/evangelo-sommer/src/components/calendar/PlaceholderEvent.tsx`

#### CSS Properties

```css
/* Base placeholder styles */
.placeholder-event {
  position: absolute;
  background: hsl(var(--accent) / 0.3);  /* 30% opacity accent */
  border: 2px dashed hsl(var(--accent));
  border-left: 4px dashed hsl(var(--accent));
  border-radius: 0.375rem;  /* 6px */
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  pointer-events: none;
  will-change: top, height;  /* Optimize for smooth dragging */
  z-index: 5;  /* Below real events (z-index: 10) */
}

/* Content styling based on height */
.placeholder-ultra-compact {  /* < 35px */
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
}

.placeholder-compact {  /* 35-50px */
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4px 12px;
}

.placeholder-full {  /* > 50px */
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4px 12px;
}
```

#### Dynamic Content Display

**Height < 35px (Ultra-Compact):**
```
[Clock Icon] 9:00am - 10:00am
```

**Height 35-50px (Compact):**
```
[Clock Icon] 9:00am - 10:00am (1h)
```

**Height > 50px (Full):**
```
New Event
[Clock Icon] 9:00 AM - 10:00 AM
1 hour
[Multi-day badge if applicable]
```

#### Color Variables

```css
--accent: 142.1 76.2% 36.3%  /* Green accent */
--accent-foreground: 355.7 100% 97.3%
```

**Actual Colors:**
- Background: `rgba(34, 197, 94, 0.3)` (green with 30% opacity)
- Border: `rgb(34, 197, 94)` (solid green)
- Text: Light foreground color for contrast

### Visual Effects

#### 1. Placeholder Animation

**File:** `/web/evangelo-sommer/src/components/calendar/PlaceholderEvent.tsx`

```typescript
// CSS properties for smooth animation
style={{
  willChange: 'top, height',  // Browser optimization hint
  transition: 'none'          // Instant updates during drag
}}
```

**No CSS transitions during drag** - updates are immediate for responsive feel

#### 2. Drag Ghost Preview

**File:** `/web/evangelo-sommer/src/components/WeekView.tsx` (lines 166-189)

```jsx
<div
  style={{
    position: 'absolute',
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${leftPercent}% + 2px)`,
    width: `calc(${widthPercent}% - 4px)`,
  }}
  className="bg-accent/20 border-2 border-accent border-dashed rounded-md"
>
  <div className="text-accent font-medium text-sm">
    {draggedEvent.title}
  </div>
  <div className="text-accent/80 text-xs">
    {isMultiDay ? `${actualDaySpan} days • ` : ''}
    {previewStartTime} - {previewEndTime}
  </div>
</div>
```

**Styles:**
- Background: `bg-accent/20` (20% opacity)
- Border: `border-2 border-accent border-dashed`
- Text color: `text-accent` (title), `text-accent/80` (time)
- Z-index: 25 (above events but below modals)

#### 3. Drop Zone Highlighting

**File:** `/web/evangelo-sommer/src/components/DropZone.tsx`

```jsx
// Valid drop target
className="bg-accent/15"

// Invalid drop target (occupied)
className="bg-red-400/15"

// Hover state (no drag)
className="bg-accent/5"

// Current time indicator
className="bg-tactical-gold shadow-sm"
```

**Opacity Scale:**
- Idle: `opacity-0` → `opacity-100` on hover
- Dragging over valid: `bg-accent/15` (15% opacity green)
- Dragging over invalid: `bg-red-400/15` (15% opacity red)
- Hover (no drag): `bg-accent/5` (5% opacity green)

#### 4. Event Resize Preview

**File:** `/web/evangelo-sommer/src/components/WeekView.tsx` (lines 1028-1100)

**Multi-Day Resize Overlay:**
```jsx
<div
  style={{
    position: 'absolute',
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${leftPercent}% + 2px)`,
    width: `calc(${widthPercent}% - 4px)`,
  }}
  className="bg-accent/30 border-2 border-accent border-dashed rounded-md"
>
  <div className="text-accent font-medium text-sm">
    {event.title} ({format(previewStart, 'h:mm a')} - {format(previewEnd, 'h:mm a')})
  </div>
</div>
```

**Styles:**
- Background: `bg-accent/30` (30% opacity, darker than drag ghost)
- Border: `border-2 border-accent border-dashed`
- Z-index: 30 (highest priority during resize)
- Shows live preview with formatted times

#### 5. Cursor Changes

**File:** `/web/evangelo-sommer/src/components/calendar/CalendarEvent.tsx`

```css
/* Base state */
cursor: pointer

/* During drag */
cursor: grabbing

/* On hover (draggable) */
cursor: grab

/* Resize handles */
cursor: ns-resize  /* top/bottom handles */
cursor: nwse-resize  /* corner handles */
```

### State Management

**Global State (DragDropContext):**
```typescript
{
  dragState: {
    isDragging: boolean
    draggedEvent: UnifiedEvent | null
    dragOffset: { x: number; y: number }
    originalSlot: { date: string; hour: number; minute?: number }
  },
  dropZoneState: {
    activeDropZone: { date: string; hour: number; minute?: number } | null
    hoveredDropZone: { date: string; hour: number; minute?: number } | null
  },
  showDropZones: boolean
}
```

**Placeholder State (Parent Component):**
```typescript
{
  date: string       // 'yyyy-MM-dd'
  hour: number       // 0-23
  minutes: number    // 0-59 for precise positioning
  duration: number   // in minutes
  title?: string     // from form input
  endDate?: string   // for multi-day events
  endHour?: number
  endMinutes?: number
}
```

**State Flow:**
```
User Double-Click → useEventCreationDrag
  ↓
Drag Movement → Update dragState
  ↓
onPlaceholderChange → Update placeholderEvent
  ↓
Sidebar Form → Update title/details
  ↓
onPlaceholderChange → Sync back to calendar
  ↓
Mouse Up → Keep placeholder, open sidebar
  ↓
Form Submit → Create actual event, clear placeholder
```

### Constraints

#### Time Constraints
- **Snap interval**: 15 minutes
- **Minimum duration**: 15 minutes
- **Maximum time**: 23:45 (last snap point before midnight)
- **Multi-day**: Preserves time-of-day span across days

#### Spatial Constraints
- **Day view**: Vertical drag only (1 column)
- **Week view**: Vertical + horizontal drag (7 columns)
- **Month view**: No drag (preview only)

#### Validation
- **Same-day events**: Cannot extend past midnight
- **Multi-day events**: Can span multiple days with preserved time range
- **Occupied slots**: Show warning but allow drop (user decision)

### Feedback Mechanisms

#### Visual Feedback
1. **Placeholder appearance**: Instant on double-click
2. **Live updates**: Placeholder grows/shrinks during drag
3. **Drop zone highlights**: Green for valid, red for occupied
4. **Cursor changes**: `grab` → `grabbing` → `grab`
5. **Ghost preview**: Shows where event will land during drag

#### Audio/Haptic
- None (web application)

#### State Feedback
1. **Form sync**: Sidebar form updates with placeholder values
2. **Time display**: Live time range shown in placeholder
3. **Multi-day indicator**: Badge shows when event spans days
4. **Conflict warnings**: Modal shown after creation if conflicts exist

---

## Mobile App Capabilities

### Available Gesture Libraries

**File:** `/apps/becky-mobile/package.json`

**Installed Packages:**
```json
{
  "react-native": "0.76.9",
  "@react-native-async-storage/async-storage": "1.23.1",
  "@react-native-community/datetimepicker": "8.2.0",
  "@react-native-picker/picker": "2.9.0"
}
```

**Notable Absence:**
- **NO** `react-native-gesture-handler` (not installed)
- **NO** `react-native-reanimated` (not installed)

**Actual Implementation:**
- Uses React Native's built-in **PanResponder** API
- Uses React Native's built-in **Animated** API
- No third-party gesture libraries

### Gesture System Architecture

**File:** `/apps/becky-mobile/components/calendar/EventBlock.tsx`

**Core Pattern:**
```typescript
// PanResponder for each gesture type
dragPanResponder = PanResponder.create({
  onStartShouldSetPanResponder: () => !isResizing,
  onMoveShouldSetPanResponder: (_, gestureState) =>
    !isResizing && Math.abs(gestureState.dy) > 5,
  onPanResponderGrant: () => {
    // Start drag: capture offset, animate feedback
  },
  onPanResponderMove: (_, gestureState) => {
    // Update position with snapping
    const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4)
    pan.setValue({ x: 0, y: snappedDy })
  },
  onPanResponderRelease: () => {
    // End drag: finalize position, update backend
  }
})
```

**Key Features:**
- **Capture phase**: Resize handles use `onStartShouldSetPanResponderCapture` to prevent parent interception
- **Gesture thresholds**: 5px minimum movement to distinguish tap from drag
- **Conflict resolution**: `isResizingRef` prevents drag during resize
- **Native animations**: Uses `useNativeDriver: true` for 60fps performance

### Existing Touch Patterns

#### 1. Event Drag (Vertical)

**File:** `/apps/becky-mobile/components/calendar/DayView.tsx`

**Pattern:**
```typescript
// DayView manages drag state
const [draggingEvent, setDraggingEvent] = useState<Event | null>(null)
const [dragOffset, setDragOffset] = useState(0)

// EventBlock handles gesture
dragPanResponder.onPanResponderMove = (_, gestureState) => {
  const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4)
  pan.setValue({ x: 0, y: snappedDy })  // Animate visual feedback
  onDragMove?.(snappedDy)                // Update parent state
}

// Visual feedback via Animated API
<Animated.View
  style={[
    styles.eventBlock,
    {
      transform: [
        { translateY: pan.y },
        { scale: scale }  // Subtle scale on drag
      ]
    }
  ]}
>
```

**Visual Feedback:**
- **Opacity**: Not changed (stays solid)
- **Scale**: `1.0 → 1.02` during drag
- **Transform**: Live `translateY` updates
- **Animation**: Spring animation for scale changes

#### 2. Event Resize (Top/Bottom Handles)

**File:** `/apps/becky-mobile/components/calendar/EventBlock.tsx`

**Pattern:**
```typescript
// Separate PanResponder for each handle
topResizePanResponder = PanResponder.create({
  onStartShouldSetPanResponderCapture: () => true,  // Capture before parent
  onPanResponderGrant: () => {
    isResizingRef.current = true  // Block drag gestures
    onResizeStart?.(event, 'top')
  },
  onPanResponderMove: (_, gestureState) => {
    const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4)
    // Clamp to prevent event smaller than 30 minutes
    const maxDy = height - MIN_EVENT_HEIGHT
    const clampedDy = Math.min(snappedDy, maxDy)
    onResizeMove?.(clampedDy, 'top')
  }
})

// Visual feedback via parent re-render
{resizingEvent?.id === event.id && resizeHandle === 'top' && (
  <View style={{ height: height - resizeOffset }} />  // Live resize preview
)}
```

**Handle Sizes:**
- **Top/Bottom handles**: 16px tall hit area
- **Corner handles**: 44x44px (accessibility standard)

**Visual Feedback:**
- **Live height updates**: Parent re-renders with new dimensions
- **No animation**: Instant updates for precise control
- **Handle visibility**: Always visible (no hover required)

#### 3. Multi-Day Resize (Corner Handles - Week View Only)

**File:** `/apps/becky-mobile/components/calendar/EventBlock.tsx` (lines 273-400)

**Handles:**
- `topLeftCornerPanResponder`
- `topRightCornerPanResponder`
- `bottomLeftCornerPanResponder`
- `bottomRightCornerPanResponder`

**Pattern:**
```typescript
// Each corner handle adjusts different combinations
// Top-left: adjusts start date AND start time
// Top-right: adjusts end date AND start time
// Bottom-left: adjusts start date AND end time
// Bottom-right: adjusts end date AND end time

bottomRightCornerPanResponder = PanResponder.create({
  onStartShouldSetPanResponderCapture: () => true,
  onPanResponderMove: (_, gestureState) => {
    const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4)
    // Track peak value to handle finger drift on release
    if (Math.abs(clampedDy) > Math.abs(peakResizeDy.current)) {
      peakResizeDy.current = clampedDy
    }
    onResizeMove?.(clampedDy, 'bottom-right')
  }
})
```

**Visual Feedback:**
- **Optimistic updates**: Event spans across days immediately
- **No overlay**: Direct manipulation of event block
- **Peak tracking**: Uses highest value reached to handle finger drift

#### 4. Time Slot Press (Event Creation)

**File:** `/apps/becky-mobile/components/calendar/DayView.tsx`

**Pattern:**
```typescript
// Tap on empty time slot opens creation modal
<TouchableOpacity
  style={styles.timeSlot}
  onPress={() => onTimeSlotPress?.(date, hour)}
>
  {/* Hour slot UI */}
</TouchableOpacity>

// Modal pre-fills with tapped time
onTimeSlotPress={(date, hour) => {
  setModalDate(date)
  setModalTime(`${hour.toString().padStart(2, '0')}:00`)
  setShowEventModal(true)
}}
```

**No Placeholder System:**
- Mobile uses **modal creation** instead of live placeholder
- User taps slot → modal opens → fills form → creates event
- **Rationale**: Better UX for touch (form in focused modal vs. sidebar)

### Gap Analysis

#### Missing from Mobile (Compared to Web)

1. **Live Placeholder During Creation**
   - Web: Double-click + drag creates visual placeholder
   - Mobile: Tap → modal (no drag creation)
   - **Impact**: Mobile is more deliberate, less spontaneous

2. **Drag Event Creation**
   - Web: `useEventCreationDrag` hook with double-click detection
   - Mobile: Not implemented
   - **Reason**: Touch doesn't have double-click (would need long-press pattern)

3. **Sidebar Form Integration**
   - Web: Live sync between placeholder and sidebar form
   - Mobile: Modal-based creation (no sidebar)
   - **Reason**: Mobile screen size constraints

4. **Drop Zone Highlights During Drag**
   - Web: Green/red highlights on valid/invalid zones
   - Mobile: No visual drop zone feedback
   - **Reason**: Direct manipulation (event stays under finger)

#### Present in Mobile (Not in Web Analysis Scope)

1. **Corner Resize Handles**
   - Mobile: All 4 corners for multi-day creation
   - Web: Has corner handles but not emphasized in docs
   - **Advantage**: More intuitive for touch (larger hit areas)

2. **Participant Confirmation Modal**
   - Mobile: Shows before/after times when updating events with participants
   - Web: Not mentioned in analysis
   - **Advantage**: Better notification UX

3. **Optimistic Updates**
   - Mobile: Updates UI immediately, rolls back on API failure
   - Web: Waits for server confirmation (less analysis detail)
   - **Advantage**: More responsive feel

4. **Year View**
   - Mobile: Year overview with event count badges
   - Web: Not mentioned (may not exist)
   - **Feature**: Mobile-specific navigation pattern

---

## Behavioral Mapping Table

| Web Behavior | Web Event | Web Visual Feedback | Mobile Equivalent | Mobile Touch Event | Mobile Visual Feedback | Constraints |
|-------------|-----------|--------------------|--------------------|-------------------|----------------------|-------------|
| **Event Creation** |
| Double-click on time slot | `handleMouseDown` (2x within 300ms) | Placeholder appears instantly | Tap on time slot | `TouchableOpacity.onPress` | Modal opens with pre-filled time | Mobile uses modal instead of inline creation |
| Drag to set duration | `handleMouseMove` | Placeholder grows/shrinks, snaps to 15-min | N/A - Use modal duration picker | N/A | N/A | Mobile doesn't support drag creation |
| Drag across days (week view) | `handleMouseMove` (horizontal) | Multi-day placeholder spanning columns | N/A | N/A | N/A | Mobile uses modal for multi-day setup |
| Release to finalize placeholder | `handleMouseUp` | Placeholder persists, sidebar opens | N/A | N/A | N/A | Mobile creates immediately on modal submit |
| **Event Dragging** |
| Press event to start drag | `onDragStart` | Cursor → `grabbing`, opacity → 0.5 | Touch event block | `PanResponder.onPanResponderGrant` | Scale → 1.02 (subtle lift) | Mobile doesn't change opacity |
| Drag vertically (change time) | `onDragMove` | Ghost preview shows at drop location | Pan gesture vertical | `PanResponder.onPanResponderMove` | Live `translateY` transform | Both snap to 15-minute intervals |
| Drag horizontally (change day) | `onDragMove` (week view) | Ghost spans across day columns | Pan gesture horizontal (week view) | `PanResponder.onPanResponderMove` | Event follows finger with offset | Web has discrete columns; mobile is continuous |
| Hover over drop zone | `onDragOver` | Highlight: `bg-accent/15` (valid) or `bg-red-400/15` (occupied) | N/A (no hover on touch) | N/A | No drop zone feedback | Mobile uses direct manipulation |
| Release to drop | `onDrop` | Ghost disappears, event moves, scale → 1.0 | End pan gesture | `PanResponder.onPanResponderRelease` | Spring animation back to scale 1.0 | Both calculate final position on release |
| **Event Resizing** |
| Hover event to show handles | Mouse hover | Top/bottom handles fade in | N/A (touch) | N/A | Handles always visible | Mobile shows handles immediately (no hover state) |
| Press top handle | `onMouseDown` on ResizeHandle | Cursor → `ns-resize` | Touch top handle (16px hit area) | `topResizePanResponder.onPanResponderGrant` | No cursor change (touch) | Both use 15-minute snapping |
| Drag top handle up | `onMouseMove` | Preview overlay shows new start time | Pan gesture up | `PanResponder.onPanResponderMove` | Parent re-renders with new height | Web shows overlay; mobile updates in-place |
| Drag top handle down | `onMouseMove` | Preview clamped to min 15-min duration | Pan gesture down | `PanResponder.onPanResponderMove` | Height shrinks with clamp enforcement | Both enforce 30px minimum (15 min) |
| Press bottom handle | `onMouseDown` on ResizeHandle | Cursor → `ns-resize` | Touch bottom handle | `bottomResizePanResponder.onPanResponderGrant` | Handle highlights subtly | Same behavior as top handle |
| Drag bottom handle down | `onMouseMove` | Preview extends event duration | Pan gesture down | `PanResponder.onPanResponderMove` | Event block extends downward | Web shows separate preview; mobile updates original |
| Press corner handle (week view) | `onMouseDown` on corner | Cursor → `nwse-resize` | Touch corner (44x44px hit area) | `cornerPanResponder.onPanResponderGrant` | No cursor feedback | Mobile has larger hit areas (44px vs ~16px web) |
| Drag corner diagonally | `onMouseMove` | Multi-day preview overlay | Pan gesture diagonal | `PanResponder.onPanResponderMove` | Event spans across days in real-time | Web shows overlay; mobile directly manipulates |
| Release resize handle | `onMouseUp` | Preview → actual event update | End pan gesture | `PanResponder.onPanResponderRelease` | API update, optimistic UI | Mobile uses peak tracking for finger drift |
| **Visual Feedback Details** |
| Placeholder appearance | CSS classes applied | Dashed border (2px), accent background (30% opacity), z-index: 5 | N/A | N/A | N/A | Mobile uses modal instead |
| Placeholder content (< 35px) | Dynamic render | Clock icon + "9:00am - 10:00am" | N/A | N/A | N/A | Mobile doesn't have placeholder |
| Placeholder content (35-50px) | Dynamic render | Time + duration badge | N/A | N/A | N/A | Mobile doesn't have placeholder |
| Placeholder content (> 50px) | Dynamic render | Title + time + duration + multi-day badge | N/A | N/A | N/A | Mobile doesn't have placeholder |
| Drag ghost appearance | CSS overlay | 20% opacity, dashed border, title + time text | N/A | N/A | No ghost - event follows finger | Mobile uses direct manipulation |
| Drop zone valid highlight | CSS class change | `bg-accent/15` (15% green) | N/A | N/A | No highlight | Mobile doesn't show drop zones |
| Drop zone invalid highlight | CSS class change | `bg-red-400/15` (15% red) | N/A | N/A | No highlight | Mobile allows dropping anywhere |
| Resize preview multi-day | CSS overlay | 30% opacity, spans columns, shows times | Direct manipulation | Event block update | Event spans columns immediately | Web uses overlay; mobile updates original |
| Event during drag | CSS transform | Opacity → 0.5, position fixed | Animated.View | `translateY` transform | Scale → 1.02, opacity → 1.0 | Web dims; mobile lifts slightly |
| Current time indicator | CSS pseudo-element | Horizontal line with dot, `bg-tactical-gold` | View component | Renders at calculated position | Horizontal line with dot, themed color | Both show live time |
| **State Management** |
| Drag state tracking | React Context | Global `dragState` + `dropZoneState` | React Context | Global `dragState` via CalendarContext | Both use centralized state |
| Placeholder sync with form | Bidirectional binding | Placeholder ↔ EventCreationForm | N/A | N/A | Mobile uses controlled modal inputs |
| Optimistic updates | Callback-based | Update on drop, no rollback shown | State-based | Immediate UI update, rollback on API failure | Mobile shows loading states |
| Conflict detection | After creation | Modal shows conflicts after event created | Before update | Participant confirmation before API call | Mobile prevents invalid states earlier |

### Key Behavioral Differences

#### 1. Event Creation Flow

**Web:**
```
Double-Click → Drag to size → Release → Sidebar opens → Fill details → Submit
```

**Mobile:**
```
Tap slot → Modal opens (pre-filled time) → Fill details → Submit → Event created
```

**Reason:** Touch lacks hover states and precise pointing, making modal-based creation more reliable.

#### 2. Visual Feedback Philosophy

**Web:**
- **Overlays**: Ghost previews, separate placeholder components
- **Indirect manipulation**: User sees preview separate from event
- **Hover states**: Shows/hides resize handles

**Mobile:**
- **Direct manipulation**: Event moves under finger
- **Inline updates**: No separate preview layers
- **Always-visible controls**: Handles always present

**Reason:** Touch interaction is inherently direct (finger occludes target), so direct manipulation feels more natural.

#### 3. Gesture Detection

**Web:**
```javascript
// Mouse-based with thresholds
const hasMoved = Math.abs(deltaY) > DRAG_THRESHOLD_PX
if (hasMoved) startDrag()
```

**Mobile:**
```javascript
// PanResponder with native gesture recognition
onMoveShouldSetPanResponder: (_, gestureState) =>
  Math.abs(gestureState.dy) > 5

// Uses capture phase for priority handling
onStartShouldSetPanResponderCapture: () => true
```

**Reason:** Touch gestures need priority handling to prevent scroll conflicts.

---

## Parallel Implementation Opportunities

### Areas for Direct Porting

#### 1. Placeholder Component Logic

**Current State:**
- Web: `PlaceholderEvent.tsx` with dynamic height-based rendering
- Mobile: No equivalent (uses modal)

**Recommendation:**
- **DON'T PORT**: Mobile's modal approach is better for touch UX
- **Alternative**: Use placeholder for **long-press drag creation** if implemented

**Code Reusability:**
```typescript
// Shared logic for content display based on height
export function getPlaceholderContent(heightPx: number, event: PlaceholderData) {
  if (heightPx < 35) return { mode: 'ultra-compact', content: timeRange }
  if (heightPx < 50) return { mode: 'compact', content: { timeRange, duration } }
  return { mode: 'full', content: { title, timeRange, duration, badges } }
}
```

#### 2. Time Snapping Calculations

**Current State:**
- Web: `useEventCreationDrag.ts` - snap to 15-minute intervals
- Mobile: `EventBlock.tsx` - same snapping logic

**Recommendation:**
- **PORT**: Extract into shared utility
- **Benefit**: Consistent behavior across platforms

**Shared Utility:**
```typescript
// packages/shared/time-utils.ts
export const SNAP_INTERVAL_MINUTES = 15
export const PIXELS_PER_HOUR = 60

export function snapToInterval(minutes: number, interval: number = SNAP_INTERVAL_MINUTES): number {
  return Math.round(minutes / interval) * interval
}

export function pixelsToMinutes(pixels: number, pixelsPerHour: number = PIXELS_PER_HOUR): number {
  return Math.round((pixels / pixelsPerHour) * 60)
}

export function minutesToPixels(minutes: number, pixelsPerHour: number = PIXELS_PER_HOUR): number {
  return (minutes / 60) * pixelsPerHour
}

export function calculateEventLayout(startTime: string, endTime: string, pixelsPerHour: number) {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const startHour = start.getHours() + start.getMinutes() / 60
  const endHour = end.getHours() + end.getMinutes() / 60
  const duration = endHour - startHour

  return {
    top: startHour * pixelsPerHour,
    height: duration * pixelsPerHour,
  }
}
```

#### 3. Multi-Day Event Logic

**Current State:**
- Web: `useEventCreationDrag.ts` - handles multi-day span calculations
- Mobile: `EventBlock.tsx` corner handles - similar calculations

**Recommendation:**
- **PORT**: Extract multi-day calculations into shared module
- **Benefit**: Consistent multi-day behavior

**Shared Logic:**
```typescript
// packages/shared/multi-day-utils.ts
export function calculateDaySpan(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.round((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000)) + 1
}

export function calculateVisualDuration(event: Event): number {
  // For multi-day events, return time-of-day span (not total duration)
  if (event.isMultiDay) {
    const start = new Date(event.startDateTime)
    const end = new Date(event.endDateTime)
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()
    return Math.abs(endMinutes - startMinutes) || 15
  }
  return event.duration || 60
}
```

#### 4. Resize Constraints

**Current State:**
- Web: `useEventResize.ts` - minimum duration, midnight clamp
- Mobile: `EventBlock.tsx` - same constraints inline

**Recommendation:**
- **PORT**: Centralize constraint logic
- **Benefit**: Consistent validation

**Shared Constraints:**
```typescript
// packages/shared/event-constraints.ts
export const MIN_EVENT_DURATION_MINUTES = 15
export const MIN_EVENT_HEIGHT_PX = 30

export function clampResizeDelta(
  dy: number,
  currentHeight: number,
  handle: 'top' | 'bottom',
  minHeight: number = MIN_EVENT_HEIGHT_PX
): number {
  if (handle === 'top') {
    // Top handle: can't shrink event below minimum
    const maxDy = currentHeight - minHeight
    return Math.min(dy, maxDy)
  } else {
    // Bottom handle: can't shrink event below minimum
    const minDy = -(currentHeight - minHeight)
    return Math.max(dy, minDy)
  }
}

export function validateEventTimes(startTime: string, endTime: string): {
  valid: boolean
  error?: string
} {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)

  if (durationMinutes < MIN_EVENT_DURATION_MINUTES) {
    return { valid: false, error: `Minimum duration is ${MIN_EVENT_DURATION_MINUTES} minutes` }
  }

  return { valid: true }
}
```

### Platform-Specific Implementations (Keep Separate)

#### 1. Gesture Handling

**Web:** Mouse events (`onMouseDown`, `onMouseMove`, `onMouseUp`)
**Mobile:** PanResponder with capture phase

**Reason:** Fundamentally different input models

#### 2. Visual Feedback Components

**Web:** CSS transforms, hover states, overlays
**Mobile:** Animated API, direct manipulation, always-visible controls

**Reason:** Different UI paradigms

#### 3. Event Creation UX

**Web:** Double-click + drag with live placeholder
**Mobile:** Tap → modal with pre-filled form

**Reason:** Touch lacks hover and precise pointing

---

## Dependencies and Sequencing

### Phase 1: Shared Utilities (Week 1)

**Goal:** Extract common logic into shared packages

**Tasks:**
1. Create `packages/shared/time-utils.ts`
   - Snap calculations
   - Pixels ↔ minutes conversions
   - Event layout calculations

2. Create `packages/shared/multi-day-utils.ts`
   - Day span calculations
   - Visual duration logic
   - Multi-day event validation

3. Create `packages/shared/event-constraints.ts`
   - Minimum duration enforcement
   - Resize delta clamping
   - Time validation

**Dependencies:** None

**Deliverables:**
- TypeScript utilities with full test coverage
- Documentation with usage examples
- Integration into both web and mobile codebases

### Phase 2: Mobile Placeholder (Optional, Week 2)

**Goal:** Implement live placeholder for drag creation on mobile

**Tasks:**
1. Port `PlaceholderEvent` component to React Native
   - Use `Animated.View` for smooth updates
   - Adapt content display for mobile screen sizes
   - Use platform-specific styling

2. Implement long-press gesture for drag creation
   - Detect long-press (500ms threshold)
   - Show placeholder on long-press start
   - Update placeholder during pan gesture
   - Open modal with placeholder values on release

3. Integrate with existing modal creation flow
   - Pre-fill modal from placeholder values
   - Allow user to adjust before creation
   - Clear placeholder on modal dismiss

**Dependencies:** Phase 1 (shared utilities)

**Deliverables:**
- React Native PlaceholderEvent component
- Long-press drag gesture handler
- Updated CalendarContext for placeholder state

### Phase 3: Enhanced Visual Feedback (Week 3)

**Goal:** Improve mobile visual feedback to match web richness

**Tasks:**
1. Implement drop zone highlights
   - Show subtle highlights during drag
   - Use platform-appropriate colors
   - Respect accessibility guidelines

2. Add ghost preview during drag
   - Semi-transparent event preview at drop location
   - Show title and time range
   - Update in real-time during drag

3. Enhance resize preview
   - Show dashed border during resize
   - Display time change indicators
   - Add haptic feedback on snap points

**Dependencies:** Phase 1 (shared utilities)

**Deliverables:**
- Drop zone highlight components
- Ghost preview overlay
- Enhanced resize visual feedback

### Phase 4: Cross-Platform Testing (Week 4)

**Goal:** Ensure consistent behavior across platforms

**Tasks:**
1. Create shared test suite
   - Unit tests for shared utilities
   - Integration tests for common workflows
   - Visual regression tests for both platforms

2. User testing sessions
   - Test web and mobile side-by-side
   - Validate gesture interactions
   - Gather feedback on consistency

3. Performance profiling
   - Measure frame rates during drag/resize
   - Optimize animation performance
   - Ensure 60fps on target devices

**Dependencies:** Phase 1-3 complete

**Deliverables:**
- Comprehensive test suite
- User testing report
- Performance optimization recommendations

### Dependency Graph

```
Phase 1: Shared Utilities
    ├── time-utils.ts
    ├── multi-day-utils.ts
    └── event-constraints.ts
           ↓
    ┌──────┴──────┐
    ↓             ↓
Phase 2:       Phase 3:
Mobile         Enhanced
Placeholder    Feedback
    ↓             ↓
    └──────┬──────┘
           ↓
    Phase 4: Testing
```

### Risk Mitigation

**High Risk:**
- **Touch gesture conflicts with scroll**: Mitigate with capture phase PanResponder
- **Performance on low-end devices**: Profile early, optimize animations

**Medium Risk:**
- **User confusion with different UX**: Provide in-app tutorials
- **Accessibility compliance**: Consult WCAG guidelines for touch targets

**Low Risk:**
- **Code divergence over time**: Use shared utilities, regular sync meetings
- **Browser/device compatibility**: Extensive cross-browser/device testing

---

## Appendix: Code References

### Web Components

1. **Time Manager Page**
   - `/web/evangelo-sommer/src/app/time-manager/page.tsx`

2. **Calendar Views**
   - `/web/evangelo-sommer/src/components/UnifiedDailyPlanner.tsx`
   - `/web/evangelo-sommer/src/components/WeekView.tsx`
   - `/web/evangelo-sommer/src/components/ScheduleCalendar.tsx` (month)

3. **Drag-and-Drop Core**
   - `/web/evangelo-sommer/src/components/DragDropContext.tsx`
   - `/web/evangelo-sommer/src/hooks/useDragAndDrop.ts`
   - `/web/evangelo-sommer/src/hooks/useEventCreationDrag.ts`

4. **Visual Components**
   - `/web/evangelo-sommer/src/components/calendar/PlaceholderEvent.tsx`
   - `/web/evangelo-sommer/src/components/DropZone.tsx`
   - `/web/evangelo-sommer/src/components/calendar/CalendarEvent.tsx`

5. **Utilities**
   - `/web/evangelo-sommer/src/utils/calendar/dragCalculations.ts`
   - `/web/evangelo-sommer/src/lib/touch-utils.ts`

### Mobile Components

1. **Calendar Views**
   - `/apps/becky-mobile/components/calendar/DayView.tsx`
   - `/apps/becky-mobile/components/calendar/WeekView.tsx`
   - `/apps/becky-mobile/components/calendar/MonthView.tsx`
   - `/apps/becky-mobile/components/calendar/YearView.tsx`

2. **Drag-and-Drop Core**
   - `/apps/becky-mobile/components/calendar/EventBlock.tsx` (PanResponder)
   - `/apps/becky-mobile/context/CalendarContext.tsx`

3. **Modals**
   - `/apps/becky-mobile/components/calendar/EventModal.tsx`
   - `/apps/becky-mobile/components/modals/ParticipantConfirmationModal.tsx`

4. **Documentation**
   - `/apps/becky-mobile/DRAG_DROP_IMPLEMENTATION.md`

---

## Conclusion

The web and mobile implementations share core logic (15-minute snapping, multi-day support, resize constraints) but diverge in interaction patterns due to platform differences. The web leverages mouse precision with hover states and overlays, while mobile prioritizes direct manipulation with touch-optimized gestures.

**Recommended Approach:**
1. **Extract shared logic** into platform-agnostic utilities (Phase 1)
2. **Keep interaction patterns platform-specific** (web's double-click+drag vs. mobile's tap+modal)
3. **Consider mobile placeholder** only if long-press drag creation proves valuable in user testing
4. **Focus on consistency** in calculations and constraints, not visual implementation

**Next Steps:**
1. Review this analysis with product and engineering teams
2. Prioritize shared utility extraction (quick win, high value)
3. User test mobile modal creation vs. potential long-press drag
4. Plan phased implementation based on user feedback
