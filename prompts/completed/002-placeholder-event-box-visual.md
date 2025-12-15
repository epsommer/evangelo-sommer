<objective>
Implement a visual placeholder event box that appears in the calendar grid when a user initiates event creation via double-click.

This placeholder provides immediate visual feedback showing where the event will be scheduled, appearing as a semi-transparent "ghost" event at the clicked time slot.
</objective>

<context>
This is the Becky CRM/Time Manager application built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

Key files to examine:
- `src/components/WeekView.tsx` - Calendar grid with events overlay layer
- `src/components/calendar/CalendarEvent.tsx` - Existing event rendering component
- `src/components/DropZone.tsx` - Time slot cells that detect clicks

The calendar uses a grid system with:
- 80 pixels per hour (`PIXELS_PER_HOUR = 80`)
- Events positioned absolutely over the grid
- Events rendered in an overlay div separate from the drop zones

This prompt DEPENDS on prompt 001 (double-click detection) being implemented first.
</context>

<requirements>
1. Create PlaceholderEvent component
   - Renders a semi-transparent "ghost" event box
   - Uses dashed or dotted border to distinguish from real events
   - Shows default duration (1 hour / 60 minutes)
   - Positioned at the clicked time slot
   - Styled to match existing neomorphic theme but with reduced opacity

2. Track placeholder state in WeekView or parent
   - State: `placeholderEvent: { date: string; hour: number; duration: number } | null`
   - Set when double-click initiates event creation
   - Clear when event is saved or creation is cancelled

3. Render placeholder in the events overlay layer
   - Position using same calculation as regular events (`top`, `height`)
   - Place in correct day column based on date
   - Use lower z-index than real events but visible over grid

4. Sync placeholder with sidebar form
   - When user changes time in sidebar form, update placeholder position
   - When user changes duration, update placeholder height
   - Placeholder should reflect what will be created

5. Visual styling
   - Background: semi-transparent accent color (e.g., `bg-accent/30`)
   - Border: dashed 2px in accent color
   - Text: "New Event" or the title if user has entered one
   - Show time range (e.g., "9:00 AM - 10:00 AM")
</requirements>

<implementation>
Create a new component:
```typescript
interface PlaceholderEventProps {
  date: string; // 'yyyy-MM-dd' format
  hour: number; // 0-23
  duration: number; // in minutes
  title?: string; // optional, from form input
  pixelsPerHour: number;
}
```

State management flow:
1. User double-clicks → sets placeholder state with default 60min duration
2. Placeholder renders in overlay
3. User fills form → title updates in placeholder
4. User adjusts time/duration → placeholder updates position/size
5. User saves → placeholder cleared, real event appears
6. User cancels → placeholder cleared

Why this matters: Immediate visual feedback helps users understand where their event will appear before committing, reducing errors and improving UX.
</implementation>

<output>
Create:
- `src/components/calendar/PlaceholderEvent.tsx` - The ghost event component

Modify:
- `src/components/WeekView.tsx` - Add placeholder state and render in overlay
- Parent component (UnifiedDailyPlanner or similar) - Pass placeholder state updates from sidebar
</output>

<verification>
Before declaring complete:
1. Double-click on a time slot
2. Verify a ghost/placeholder event box appears at that position
3. Verify placeholder has distinct styling (dashed border, semi-transparent)
4. Verify placeholder shows correct time range
5. If title is typed in sidebar, verify it appears in placeholder
6. Submit the event and verify placeholder is replaced by real event
7. Cancel creation and verify placeholder disappears
</verification>

<success_criteria>
- Placeholder event box appears immediately on double-click
- Placeholder is visually distinct from real events (ghost styling)
- Placeholder shows at correct position based on clicked time slot
- Placeholder clears when event is created or cancelled
- Placeholder updates if sidebar form time/duration changes
</success_criteria>
