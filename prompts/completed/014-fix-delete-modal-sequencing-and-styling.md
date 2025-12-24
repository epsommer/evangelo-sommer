<objective>
Fix the delete confirmation modal system to show the correct modal based on event type, fix modal sizing issues, and ensure window styling respects user preferences.

This task addresses three related issues with the event deletion flow in the calendar:
1. Wrong modal appearing first for recurring/multiday events
2. Modal height too tall and horizontal overflow on desktop
3. Tactical/HUD styling appearing when neomorphic window style is selected
</objective>

<context>
This is a Next.js calendar application with different event types:
- Single-day events (standard delete confirmation)
- Recurring events (special modal with options: delete one, delete all)
- All-day multiday events (special modal for span handling)

User theme preferences are stored in account settings under "Display & Themes" with options including:
- "neomorphic" - rounded corners, soft shadows
- "tactical" / "45 degree" - angular HUD-style frames

Currently, when deleting a recurring event, the generic delete confirmation modal appears BEFORE the recurring-specific modal, causing UX confusion.

@src/components/ActionSidebar.tsx - likely contains delete button handlers
@src/components/time-manager/ - calendar components
@src/app/time-manager/page.tsx - main page with modal state management
</context>

<research>
Before implementing, explore the codebase to understand:

1. **Modal flow**: Find where delete button click handlers are defined. Trace the flow to understand why two modals appear and in what order.

2. **Event type detection**: Identify how to determine if an event is:
   - A single-day event (no recurrence, not spanning multiple days)
   - A recurring event (has recurrence pattern or recurrenceGroupId)
   - An all-day multiday event (isAllDay + spans multiple dates)

3. **Modal components**: Locate all delete-related modals:
   - Generic delete confirmation modal
   - Recurring event delete modal
   - Multiday event delete modal

4. **Theme preference access**: Find where window style preferences are stored and how to read the current setting (neomorphic vs tactical vs 45-degree).

5. **tactical-frame usage**: Search for `tactical-frame` class usage in the delete modal components to identify where hardcoded styling needs conditional logic.
</research>

<requirements>
## Part 1: Fix Modal Sequencing

1. When user clicks delete on an event, determine event type FIRST before showing any modal
2. Implement conditional modal selection:
   - Single-day event → show standard delete confirmation modal only
   - Recurring event → show recurring event delete modal only (skip generic modal)
   - All-day multiday event → show multiday delete confirmation modal only
3. Ensure only ONE modal appears per delete action, never two in sequence

## Part 2: Fix Modal Sizing

1. Reduce modal height for recurring and multiday delete modals
2. Ensure modal fits within viewport, not cut off by site header
3. Fix horizontal overflow - modal content must fit within modal bounds
4. Test at desktop viewport sizes (MacBook Pro ~1440px width)

## Part 3: Fix Theme-Respecting Styling

1. Find all uses of `tactical-frame` class in delete modals
2. Replace hardcoded tactical styling with conditional classes based on user's window style preference
3. When user has "neomorphic" selected:
   - Use rounded corners (rounded-lg or similar)
   - Remove 45-degree corner clips
   - Apply soft neomorphic shadows instead of sharp borders
4. When user has "tactical" or "45 degree" selected:
   - Keep current tactical-frame styling
</requirements>

<implementation>
For modal sequencing, create a helper function:

```typescript
function getDeleteModalType(event: CalendarEvent): 'single' | 'recurring' | 'multiday' {
  // Check for recurring event
  if (event.recurrenceGroupId || event.recurrencePattern) {
    return 'recurring';
  }

  // Check for all-day multiday event
  if (event.isAllDay && event.startDate !== event.endDate) {
    return 'multiday';
  }

  return 'single';
}
```

For conditional styling, create a utility that maps window style preference to CSS classes:

```typescript
function getModalFrameClass(windowStyle: string): string {
  if (windowStyle === 'tactical' || windowStyle === '45-degree') {
    return 'tactical-frame';
  }
  return 'rounded-lg shadow-neomorphic'; // or appropriate neomorphic classes
}
```

Avoid:
- Showing multiple modals for a single delete action
- Hardcoding styling classes without checking user preferences
- Breaking existing modal functionality for single-day events
</implementation>

<output>
Modify the following files as needed:
- `./src/components/ActionSidebar.tsx` - update delete button handler
- `./src/app/time-manager/page.tsx` - update modal state management
- Delete modal components - fix sizing and conditional styling
- Utility files - add helper functions if needed
</output>

<verification>
Test the following scenarios:

1. **Single-day event delete**: Click delete → only standard confirmation modal appears
2. **Recurring event delete**: Click delete → only recurring event modal appears (with options for single/all)
3. **Multiday all-day event delete**: Click delete → only multiday modal appears
4. **Modal sizing**: All modals fit within viewport without header cutoff or horizontal scroll
5. **Theme switching**:
   - Set window style to "neomorphic" → modals have rounded corners
   - Set window style to "tactical" → modals have angular tactical frame
</verification>

<success_criteria>
- Only one modal appears per delete action
- Correct modal type shown based on event type
- No modal height overflow (top not cut by header)
- No horizontal overflow in modal content
- Modal styling matches user's selected window style preference
- Existing delete functionality unchanged for single events
</success_criteria>
