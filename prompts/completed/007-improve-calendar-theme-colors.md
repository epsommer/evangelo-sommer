<objective>
Improve calendar event colors for better legibility and visual hierarchy while respecting the user's selected theme (light/dark mode) from account settings. Events should be easily distinguishable, readable, and aesthetically consistent with the application's neomorphic design system.
</objective>

<context>
Prerequisites: Prompts 001-006 completed.

Current issues:
- Event text may be hard to read against certain backgrounds
- Color contrast insufficient in some theme modes
- Event colors don't adapt well between light and dark themes
- Visual hierarchy unclear when multiple events overlap or stack

Tech stack:
- React 19, TypeScript, Next.js 15
- Tailwind CSS with CSS custom properties for theming
- Neomorphic design system (soft shadows, subtle gradients)
- User theme preference stored in account settings

Key files:
- `src/app/globals.css` - CSS variables for theming
- `src/components/calendar/CalendarEvent.tsx` - Event styling
- `src/components/WeekView.tsx` - Week view event rendering
- `src/components/DailyPlanner.tsx` - Day view event rendering
- User settings context/store for theme preference
</context>

<requirements>

## Color System Requirements

### 1. Event Type Colors
Define distinct colors for different event types:
- **Default/Personal**: Primary brand color
- **Meeting/Appointment**: Blue tones
- **Task/Deadline**: Orange/amber tones
- **Blocked/Busy**: Gray tones
- **External Calendar**: Distinguishable from internal events

### 2. Contrast Requirements
- Text on events: minimum 4.5:1 contrast ratio (WCAG AA)
- Event against background: clearly distinguishable
- Resize handles: visible on all event colors
- Hover/active states: perceptible change

### 3. Theme Adaptation
- Light mode: Softer, pastel-adjacent event colors
- Dark mode: Richer, more saturated colors
- Colors should feel cohesive with neomorphic shadows

### 4. Visual States
- Default state
- Hover state (subtle highlight)
- Active/dragging state (elevated, distinct)
- Selected state (border or glow)
- Past events (slightly muted)

</requirements>

<implementation>

## CSS Variable Structure

```css
/* globals.css */
:root {
  /* Event base colors - light mode */
  --event-default-bg: hsl(220, 70%, 95%);
  --event-default-text: hsl(220, 70%, 25%);
  --event-default-border: hsl(220, 70%, 85%);

  --event-meeting-bg: hsl(200, 80%, 92%);
  --event-meeting-text: hsl(200, 80%, 25%);
  --event-meeting-border: hsl(200, 80%, 80%);

  --event-task-bg: hsl(35, 90%, 92%);
  --event-task-text: hsl(35, 90%, 25%);
  --event-task-border: hsl(35, 90%, 80%);

  --event-blocked-bg: hsl(0, 0%, 92%);
  --event-blocked-text: hsl(0, 0%, 35%);
  --event-blocked-border: hsl(0, 0%, 80%);

  /* State modifiers */
  --event-hover-brightness: 0.97;
  --event-active-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --event-past-opacity: 0.7;
}

[data-theme="dark"] {
  /* Event base colors - dark mode */
  --event-default-bg: hsl(220, 50%, 25%);
  --event-default-text: hsl(220, 70%, 90%);
  --event-default-border: hsl(220, 50%, 35%);

  --event-meeting-bg: hsl(200, 60%, 25%);
  --event-meeting-text: hsl(200, 80%, 90%);
  --event-meeting-border: hsl(200, 60%, 35%);

  --event-task-bg: hsl(35, 70%, 25%);
  --event-task-text: hsl(35, 90%, 90%);
  --event-task-border: hsl(35, 70%, 35%);

  --event-blocked-bg: hsl(0, 0%, 25%);
  --event-blocked-text: hsl(0, 0%, 80%);
  --event-blocked-border: hsl(0, 0%, 35%);

  /* State modifiers - dark mode */
  --event-hover-brightness: 1.1;
  --event-active-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
```

## Event Component Styling

```typescript
// CalendarEvent.tsx
const getEventColorClasses = (event: UnifiedEvent, isPast: boolean) => {
  const typeMap = {
    meeting: 'event-meeting',
    task: 'event-task',
    blocked: 'event-blocked',
    default: 'event-default'
  }

  const typeClass = typeMap[event.eventType] || typeMap.default
  const pastClass = isPast ? 'event-past' : ''

  return `${typeClass} ${pastClass}`
}

// In JSX
<motion.div
  className={cn(
    'calendar-event',
    getEventColorClasses(event, isPast),
    'rounded-lg transition-all duration-150',
    isActive && 'event-active',
    isHovered && 'event-hover'
  )}
  style={{
    backgroundColor: 'var(--event-bg)',
    color: 'var(--event-text)',
    borderColor: 'var(--event-border)',
  }}
>
```

## Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        event: {
          'default-bg': 'var(--event-default-bg)',
          'default-text': 'var(--event-default-text)',
          // ... etc
        }
      }
    }
  }
}
```

## Theme Integration
```typescript
// Hook to get user's theme preference
const useUserTheme = () => {
  // Read from user settings context/store
  const { user } = useAuth()
  return user?.settings?.theme || 'system'
}

// Apply theme class to root
useEffect(() => {
  const theme = userTheme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : userTheme

  document.documentElement.setAttribute('data-theme', theme)
}, [userTheme])
```

## Neomorphic Integration
```css
/* Soft neomorphic shadow for events */
.calendar-event {
  box-shadow:
    2px 2px 4px var(--neo-shadow-dark),
    -2px -2px 4px var(--neo-shadow-light);
}

.calendar-event.event-active {
  box-shadow:
    4px 4px 8px var(--neo-shadow-dark),
    -4px -4px 8px var(--neo-shadow-light),
    inset 1px 1px 2px var(--neo-shadow-light);
}
```

</implementation>

<output>
Modify/create files:
- `src/app/globals.css` - Add event color CSS variables
- `src/components/calendar/CalendarEvent.tsx` - Apply new color system
- `src/components/WeekView.tsx` - Ensure events use new colors
- `src/components/DailyPlanner.tsx` - Ensure events use new colors
- `src/components/UnifiedDailyPlanner.tsx` - Ensure events use new colors
- `tailwind.config.js` - Extend with event color utilities (optional)
- `src/hooks/useUserTheme.ts` - Theme preference hook (if not exists)
</output>

<verification>
Test color system:

**Light Mode**
- [ ] Event text is readable (4.5:1+ contrast)
- [ ] Different event types have distinct colors
- [ ] Resize handles visible on all event colors
- [ ] Hover state visible but subtle
- [ ] Active state clearly elevated

**Dark Mode**
- [ ] Event text is readable (4.5:1+ contrast)
- [ ] Colors feel richer/more saturated than light mode
- [ ] Same visual hierarchy as light mode
- [ ] No harsh or jarring color transitions

**Theme Switching**
- [ ] Changing theme updates event colors immediately
- [ ] No flash of wrong colors on page load
- [ ] System preference detection works

**Visual Design**
- [ ] Events integrate with neomorphic design
- [ ] Past events visually muted
- [ ] External calendar events distinguishable
- [ ] Overlapping events readable

**Accessibility**
- [ ] Run contrast checker on all color combinations
- [ ] Test with color blindness simulators
</verification>

<success_criteria>
- All event text meets WCAG AA contrast requirements
- Event types are visually distinguishable
- Colors adapt appropriately to light/dark themes
- User's theme preference from settings is respected
- Events integrate with existing neomorphic design
- Visual states (hover, active, past) are clear
- TypeScript compiles without errors
</success_criteria>
