<objective>
Thoroughly analyze the Becky CRM and time-manager calendar components to understand the current architecture, identify issues, and create an implementation roadmap.

This analysis will inform subsequent implementation prompts for event resize/drag functionality, view-specific displays, and calendar synchronization.
</objective>

<context>
This is a Next.js 15 application with:
- React 19, TypeScript, Prisma ORM
- Existing calendar views: Day, Week, Month, Year, Agenda
- react-rnd for resize/drag (partially implemented)
- Framer Motion for animations
- Google Calendar and Notion integrations exist
- Becky CRM system with clients and scheduled events

Key files to examine:
@src/components/ScheduleCalendar.tsx
@src/components/DailyPlanner.tsx
@src/components/UnifiedDailyPlanner.tsx
@src/components/WeekView.tsx
@src/components/YearView.tsx
@src/components/AgendaView.tsx
@src/components/DragAndDropEvent.tsx
@src/components/ContinuousEventBlock.tsx
@src/components/EventCreationModal.tsx
@src/components/EventDetailsModal.tsx
@src/components/RescheduleConfirmationModal.tsx
@src/components/ResizeConfirmationModal.tsx
@src/components/ClientSelector.tsx
@src/components/TimeManagerNavigation.tsx
@src/components/ViewSelector.tsx
@src/hooks/useEventResize.ts
@src/hooks/useEventMutation.ts
@prisma/schema.prisma
</context>

<analysis_requirements>

1. **Architecture Mapping**
   - Document the component hierarchy for calendar views
   - Identify shared vs view-specific components
   - Map data flow: API → state → components
   - Identify the event/schedule data models in Prisma

2. **Client vs Participant Analysis** (CRITICAL)
   - Find where "client" and "participant" concepts are used
   - Identify the source of confusion between these entities
   - Document the correct relationship: clients are CRM contacts, participants are event attendees
   - List all files where this confusion manifests

3. **Event Interaction Assessment**
   - Current resize functionality: what works, what's broken
   - Current drag functionality: what works, what's broken
   - Handle placement and hit-box logic
   - Confirmation modal trigger conditions

4. **View-Specific Analysis**
   For each view (Day, Week, Month, Year), document:
   - How events are currently rendered
   - Event sizing/positioning logic
   - Interaction capabilities (drag, resize, click)
   - Gaps vs requirements

5. **Calendar Sync Status**
   - Current Google Calendar integration state
   - Current Notion integration state
   - API endpoints for calendar operations
   - Sync direction and frequency

6. **Package Assessment**
   Review current packages for event interactions:
   - react-rnd usage and limitations
   - Framer Motion usage opportunities
   - Any missing dependencies needed

</analysis_requirements>

<output_format>
Save comprehensive analysis to: `./analyses/calendar-system-analysis.md`

Structure the output as:
```markdown
# Calendar System Analysis

## Executive Summary
[Key findings and recommended approach]

## 1. Architecture Overview
### Component Hierarchy
### Data Flow
### Prisma Models

## 2. Client vs Participant Issue
### Current State
### Files Affected
### Recommended Fix

## 3. Event Interactions
### Day View
### Week View
### Month View
### Year View
### Common Issues

## 4. Calendar Sync Status
### Google Calendar
### Notion
### API Endpoints

## 5. Package Recommendations
### Current Usage
### Recommended Changes

## 6. Implementation Roadmap
### Phase 1: Fix client/participant confusion
### Phase 2: Unified event resize/drag
### Phase 3: View-specific enhancements
### Phase 4: Calendar sync improvements

## 7. File Change Inventory
[List of all files that will need modification]
```
</output_format>

<verification>
Before completing, verify:
- [ ] All calendar-related components have been examined
- [ ] Client/participant confusion source is clearly identified
- [ ] Each view's current state is documented
- [ ] Sync status for both Google and Notion is assessed
- [ ] Implementation roadmap is actionable and sequenced
- [ ] Analysis file is saved to ./analyses/calendar-system-analysis.md
</verification>

<success_criteria>
- Complete architectural understanding documented
- Client/participant issue root cause identified with file locations
- Clear inventory of what works vs what needs fixing per view
- Actionable roadmap that subsequent prompts can follow
- No ambiguity about current state or required changes
</success_criteria>
