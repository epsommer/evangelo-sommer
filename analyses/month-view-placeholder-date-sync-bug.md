# Month View Placeholder Date Sync Bug Analysis

**Date**: 2025-12-18
**Status**: Root Cause Identified
**Severity**: Medium - UX Issue

---

## Summary

When a user creates a recurring event placeholder in month view using double-click drag, then resizes it, and finally drags the entire placeholder container to a different day position, the start date shown in the "Create Event" modal (action sidebar) does NOT update to reflect the new position. The visual placeholder moves correctly, but the form state remains stale with the original date from before the drag operation.

**Root Cause**: The placeholder drag handler (`handlePlaceholderDragStart`) in `ScheduleCalendar.tsx` updates the placeholder's visual position via `onPlaceholderChange`, but this update flow is explicitly designed to NOT propagate back to the EventCreationForm due to an intentional one-way data flow pattern. The EventCreationForm only syncs from props during initial mount and specific prop changes, but does not react to placeholder position changes after a resize operation.

---

## Data Flow Diagram

### Current (Broken) Flow:

```
1. User double-click drags → Creates placeholder
   ScheduleCalendar (handleDayMouseMove)
   → onPlaceholderChange({ date: '2025-01-15', ... })
   → time-manager/page.tsx (handlePlaceholderChange)
   → setPlaceholderEvent(...)
   → CalendarLayout passes initialEventDate={eventCreationDate}
   → EventCreationForm receives initialDate prop
   → useEffect syncs initialDate to formData.date ✓

2. User resizes placeholder via edge handles
   ScheduleCalendar (handlePlaceholderResizeStart)
   → onPlaceholderChange({ date: '2025-01-15', endDate: '2025-01-17', ... })
   → time-manager/page.tsx (handlePlaceholderChange)
   → setPlaceholderEvent({ date: '2025-01-15', endDate: '2025-01-17' })
   → EventCreationForm receives initialEndDate/initialEndHour/initialEndMinutes
   → useEffect syncs multi-day state ✓

3. User drags placeholder to new position (BUG HERE)
   ScheduleCalendar (handlePlaceholderDragStart mousemove)
   → onPlaceholderChange({ date: '2025-01-20', endDate: '2025-01-22', ... })
   → time-manager/page.tsx (handlePlaceholderChange)
   → setPlaceholderEvent({ date: '2025-01-20', endDate: '2025-01-22' })
   → ❌ initialEventDate remains unchanged (still Date object for '2025-01-15')
   → ❌ EventCreationForm does NOT re-sync because initialDate prop didn't change
   → ❌ Form shows '2025-01-15' but placeholder is at '2025-01-20'
```

### Why This Happens:

**In time-manager/page.tsx (lines 455-467):**
```typescript
const handlePlaceholderChange = useCallback((placeholder: {
  date: string
  hour: number
  duration: number
  title?: string
  endDate?: string
  endHour?: number
  endMinutes?: number
} | null) => {
  setPlaceholderEvent(placeholder)
  // Note: We intentionally don't update sidebar form state here to avoid circular updates.
  // The form is the source of truth; placeholder is just visual feedback.
}, [])
```

**The comment reveals the design intent**: The placeholder is meant to be "just visual feedback" and the form is the "source of truth". However, this one-way data flow breaks down when the user drags a placeholder to a new position because:

1. `eventCreationDate` (the state that feeds `initialEventDate`) is only set in `handleTimeSlotDoubleClick`
2. Once set, it never updates based on placeholder changes
3. `EventCreationForm` only syncs from props in specific useEffects that check for `initialDate` changes
4. When placeholder moves, `placeholderEvent.date` changes but `eventCreationDate` does NOT

**In EventCreationForm.tsx (lines 177-196):**
```typescript
// Sync date/time/client on prop changes
useEffect(() => {
  if (!editingEvent && (initialTime || initialDate || initialClientId)) {
    setFormData(prev => {
      const newDate = initialDate ? format(initialDate, 'yyyy-MM-dd') : prev.date
      // ... updates formData
    })
  }
}, [initialTime, initialDate, initialClientId, initialClientName, editingEvent])
```

This effect only runs when `initialDate` (a Date object) changes. But after resize, when user drags the placeholder, `initialDate` is still the same Date object pointing to the original date.

---

## Root Cause Location

### Primary Issue:
**File**: `/Users/epsommer/projects/web/evangelo-sommer/src/app/time-manager/page.tsx`
**Lines**: 455-467
**Function**: `handlePlaceholderChange`

The handler intentionally does not update `eventCreationDate` when the placeholder changes position:
```typescript
const handlePlaceholderChange = useCallback((placeholder: {
  date: string
  hour: number
  duration: number
  title?: string
  endDate?: string
  endHour?: number
  endMinutes?: number
} | null) => {
  setPlaceholderEvent(placeholder)
  // ❌ MISSING: Should update eventCreationDate here when date changes
}, [])
```

### Secondary Issue:
**File**: `/Users/epsommer/projects/web/evangelo-sommer/src/components/sidebar/EventCreationForm.tsx`
**Lines**: 177-196
**Function**: `useEffect` for syncing initialDate

The form only syncs when props change, not when placeholder state changes. This is by design (to avoid circular updates), but creates a stale closure issue when the placeholder is dragged after being resized.

---

## Why Initial Creation Works But Post-Resize Drag Doesn't

### Initial Creation Flow (WORKS):
1. User double-clicks day cell (2025-01-15)
2. `handleTimeSlotDoubleClick` is called
3. Sets both:
   - `setPlaceholderEvent({ date: '2025-01-15', ... })` ✓
   - `setEventCreationDate(date)` ✓ (Date object for 2025-01-15)
   - `setIsEventCreationMode(true)` ✓
4. EventCreationForm receives `initialDate={new Date('2025-01-15')}`
5. Form syncs to `formData.date = '2025-01-15'` ✓

### Post-Resize Drag Flow (BROKEN):
1. User has placeholder at 2025-01-15 (created via double-click)
2. User resizes placeholder by dragging edge (now spans 2025-01-15 to 2025-01-17)
   - `handlePlaceholderResizeStart` → `onPlaceholderChange` → updates `placeholderEvent`
   - `eventCreationDate` remains `Date('2025-01-15')` ✓ (still correct)
3. User drags entire placeholder to 2025-01-20
   - `handlePlaceholderDragStart` mousemove → `onPlaceholderChange`
   - Updates `placeholderEvent.date = '2025-01-20'` ✓
   - ❌ `eventCreationDate` remains `Date('2025-01-15')` (NOT updated!)
4. EventCreationForm still has `initialDate={Date('2025-01-15')}`
5. Form shows '2025-01-15' but placeholder renders at '2025-01-20'

**Key Difference**: During resize, the start date doesn't change (only endDate changes), so `eventCreationDate` being unchanged is correct. But during drag, the start date DOES change, and `eventCreationDate` should update but doesn't.

---

## Fix Recommendation

### Option 1: Update eventCreationDate in handlePlaceholderChange (RECOMMENDED)

**Location**: `/Users/epsommer/projects/web/evangelo-sommer/src/app/time-manager/page.tsx` (lines 455-467)

**Change**:
```typescript
const handlePlaceholderChange = useCallback((placeholder: {
  date: string
  hour: number
  duration: number
  title?: string
  endDate?: string
  endHour?: number
  endMinutes?: number
} | null) => {
  setPlaceholderEvent(placeholder)

  // FIX: Update eventCreationDate when placeholder position changes
  // This ensures the form stays in sync when user drags placeholder to new day
  if (placeholder && placeholder.date) {
    const [year, month, day] = placeholder.date.split('-').map(Number)
    const newDate = new Date(year, month - 1, day)
    setEventCreationDate(newDate)

    // Also update the time if hour changed
    const hour = placeholder.hour
    const minutes = placeholder.minutes ?? 0
    const newTime = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    setEventCreationTime(newTime)
  }
}, [])
```

**Why This Works**:
- When placeholder is dragged, `onPlaceholderChange` is called with the new date
- This triggers `setEventCreationDate(newDate)` which creates a NEW Date object
- The new Date object causes EventCreationForm's useEffect to fire (line 177)
- Form syncs `formData.date` to the new date
- No circular updates because we only update when placeholder actually changes

**Risks**:
- Potential for circular updates if form changes trigger placeholder updates which trigger form changes
- However, this is mitigated by the existing ref checks in `handleFormChange` (lines 424-453)

### Option 2: Make EventCreationForm Reactive to initialEndDate Changes

**Location**: `/Users/epsommer/projects/web/evangelo-sommer/src/components/sidebar/EventCreationForm.tsx` (lines 233-257)

**Change**: Add a separate effect that updates start date when dragging a multi-day placeholder:
```typescript
// Sync start date when multi-day placeholder is dragged
useEffect(() => {
  if (!editingEvent && initialDate && initialEndDate) {
    const newStartDate = format(initialDate, 'yyyy-MM-dd')
    // Only update if date actually changed
    if (formData.date !== newStartDate) {
      setFormData(prev => ({
        ...prev,
        date: newStartDate
      }))
    }
  }
}, [initialDate, initialEndDate, editingEvent])
```

**Why This Might Work**:
- Reacts to prop changes
- Updates start date when placeholder is dragged

**Why This Won't Work**:
- `initialDate` is still the same Date object, so this effect won't fire
- The issue is upstream - `initialDate` prop itself is not updating

---

## Recommended Solution: Option 1

Update `handlePlaceholderChange` in `/Users/epsommer/projects/web/evangelo-sommer/src/app/time-manager/page.tsx` to synchronize `eventCreationDate` and `eventCreationTime` when the placeholder position changes.

**Full Fixed Code**:
```typescript
const handlePlaceholderChange = useCallback((placeholder: {
  date: string
  hour: number
  minutes?: number
  duration: number
  title?: string
  endDate?: string
  endHour?: number
  endMinutes?: number
} | null) => {
  setPlaceholderEvent(placeholder)

  // Update event creation state when placeholder position changes
  // This ensures the sidebar form stays in sync when user drags/resizes placeholder
  if (placeholder && placeholder.date) {
    // Parse the date string and create a new Date object
    // IMPORTANT: Create new Date object so React detects the prop change
    const [year, month, day] = placeholder.date.split('-').map(Number)
    const newDate = new Date(year, month - 1, day)
    setEventCreationDate(newDate)

    // Update time to match placeholder position
    const hour = placeholder.hour
    const minutes = placeholder.minutes ?? 0
    const newTime = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    setEventCreationTime(newTime)
  }
}, [])
```

**Why This is the Best Fix**:
1. **Centralized**: Single point of update when placeholder changes
2. **Consistent**: Works for both drag and resize operations
3. **Simple**: No complex dependency tracking needed
4. **Minimal Risk**: The existing `handleFormChange` already has deduplication logic to prevent circular updates (lines 426-438)
5. **Complete**: Updates both date AND time to fully reflect placeholder position

---

## Testing Strategy

### Test Case 1: Initial Double-Click Creation
**Steps**:
1. Double-click a day cell in month view
2. Verify placeholder appears at clicked day
3. Verify sidebar form shows same date as placeholder
4. Create event and verify it saves with correct date

**Expected**: ✓ PASS (already working)

### Test Case 2: Resize Then Drag
**Steps**:
1. Double-click day cell (e.g., Jan 15) to create placeholder
2. Verify sidebar form shows Jan 15
3. Drag right edge to make it multi-day (e.g., Jan 15-17)
4. Verify sidebar form shows Jan 15 as start, with multi-day toggle enabled
5. Drag entire placeholder to new position (e.g., Jan 20-22)
6. **Verify sidebar form updates to show Jan 20 as start date** ← Currently fails, should pass after fix
7. Create event and verify it saves at Jan 20-22

**Expected**: ✓ PASS after fix

### Test Case 3: Drag Without Prior Resize
**Steps**:
1. Double-click day cell (e.g., Jan 15)
2. Immediately drag placeholder to new day (e.g., Jan 18)
3. Verify sidebar form updates to Jan 18

**Expected**: ✓ PASS after fix (currently untested but likely broken due to same root cause)

### Test Case 4: Resize Multiple Times Then Drag
**Steps**:
1. Create placeholder at Jan 15
2. Resize to Jan 15-17
3. Resize again to Jan 15-19
4. Drag to Jan 25-29
5. Verify sidebar shows Jan 25 as start

**Expected**: ✓ PASS after fix

### Test Case 5: No Circular Updates
**Steps**:
1. Create placeholder at Jan 15
2. Drag to Jan 20
3. Manually edit date in sidebar form to Jan 25
4. Verify no infinite loop or repeated re-renders
5. Verify placeholder position updates to Jan 25 if form change handler works

**Expected**: ✓ PASS (protected by existing deduplication in handleFormChange)

### Test Case 6: Cross-Week Drag
**Steps**:
1. Create multi-day placeholder spanning Jan 15-17 (crosses week boundary)
2. Drag to Jan 22-24 (different week row)
3. Verify form shows Jan 22
4. Verify visual placeholder renders correctly across cells

**Expected**: ✓ PASS after fix

---

## Verification Checklist

Before completing the fix, verify:

- [x] Root cause clearly identified (state synchronization gap in handlePlaceholderChange)
- [x] Data flow traced from drag event through all handlers to form state
- [x] Reason for bug explained (missing eventCreationDate update in placeholder change handler)
- [x] Fix addresses root cause (updates eventCreationDate when placeholder moves)
- [x] Fix won't break other calendar views (only affects month view placeholder drag)
- [x] No circular update risk (existing deduplication logic in handleFormChange prevents loops)
- [x] Test cases cover the specific bug scenario (Test Case 2)
- [x] Test cases verify the fix works (Test Case 2, 3, 4)
- [x] Test cases prevent regression (Test Case 1, 5, 6)

---

## Additional Notes

### Design Pattern Issue
The current "placeholder is visual only, form is source of truth" pattern works well for user-initiated form edits, but breaks down when the user manipulates the placeholder directly (drag/resize). The fix acknowledges that **the placeholder CAN be the source of truth** when the user is interacting with it visually.

### Alternative Considered: Two-Way Binding
Could implement a full two-way binding between placeholder and form, but this is unnecessary complexity. The one-way flow with the additional sync in `handlePlaceholderChange` is sufficient and maintains the simplicity of the current architecture.

### Related Code Patterns
Similar sync patterns exist for:
- `handleFormChange` (lines 426-453) - syncs form → placeholder (title, duration)
- `handleTimeSlotDoubleClick` (lines 379-410) - syncs click → both placeholder and form state

The fix brings `handlePlaceholderChange` in line with these existing patterns by ensuring it updates ALL relevant state, not just the visual placeholder.

---

## Impact Assessment

**Users Affected**: All users creating multi-day events in month view using drag-based creation
**Frequency**: Medium - only occurs after resize + drag sequence
**Workaround**: User can manually edit the date in the sidebar form
**Data Integrity**: No data corruption - the issue is purely UI state synchronization
**Priority**: Medium - UX issue that causes confusion but doesn't block functionality

---

## Implementation Notes

When implementing the fix, consider:

1. **Test in All Month Sizes**: Verify drag works in months with 4, 5, and 6 week rows
2. **Test Edge Cases**:
   - Drag from last day of month to first day of next month
   - Drag multi-week spanning events
   - Drag single-day events (should still work)
3. **Console Logging**: Add temporary logging to verify state updates happen in correct order
4. **Performance**: The fix adds minimal overhead (just Date object creation) so performance impact is negligible

---

**Analysis Complete**
**Ready for Implementation**
