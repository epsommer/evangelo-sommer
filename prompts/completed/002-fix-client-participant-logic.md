<objective>
Fix the client/participant confusion in the calendar system and update the reschedule confirmation modal to only appear when events have participants.

This ensures the CRM correctly distinguishes between:
- **Clients**: CRM contacts (businesses/people you work with)
- **Participants**: People attending a specific event/meeting
</objective>

<context>
Prerequisites: Run prompt 001 first to get the analysis at `./analyses/calendar-system-analysis.md`

Tech stack: Next.js 15, React 19, TypeScript, Prisma ORM

The current system incorrectly associates clients with participants, causing:
1. Wrong data relationships in the database
2. Incorrect UI behavior in event modals
3. Reschedule confirmation showing when it shouldn't

Reference the analysis file for specific file locations and current state.
</context>

<requirements>

1. **Data Model Clarification**
   - Review Prisma schema for Event, Client, Participant models
   - Ensure proper relationships:
     - Event can have multiple Participants (attendees)
     - Event can be associated with a Client (the CRM contact it's for)
     - These are SEPARATE concepts
   - Create migration if schema changes needed

2. **Component Updates**
   - Update ClientSelector to only select CRM clients, not participants
   - Update EventCreationModal to properly distinguish client selection from participant addition
   - Update EventDetailsModal to show both client (who it's for) and participants (who's attending)

3. **Confirmation Modal Logic**
   - RescheduleConfirmationModal should ONLY appear when:
     - Event has participants (attendees who need notification)
   - Should NOT appear when:
     - Event has no participants (solo events, personal tasks)
     - Event only has a client association (client doesn't need reschedule notification)

4. **Type Safety**
   - Update TypeScript interfaces to clearly type Client vs Participant
   - Ensure no type coercion between these entities

</requirements>

<implementation>

1. **Schema Review** (if changes needed):
   ```prisma
   model Event {
     // ... existing fields
     clientId     String?   // The CRM client this event is FOR
     client       Client?   @relation(fields: [clientId], references: [id])
     participants Participant[] // People ATTENDING the event
   }

   model Participant {
     id       String @id @default(cuid())
     email    String
     name     String?
     eventId  String
     event    Event  @relation(fields: [eventId], references: [id])
   }
   ```

2. **Modal Logic Pattern**:
   ```typescript
   // In reschedule handler
   const shouldShowConfirmation = event.participants && event.participants.length > 0;

   if (shouldShowConfirmation) {
     setShowRescheduleConfirmation(true);
   } else {
     // Direct reschedule without confirmation
     await rescheduleEvent(event.id, newTime);
   }
   ```

3. **Avoid These Anti-patterns**:
   - Don't treat clientId as a participant
   - Don't show participant-related UI when there are none
   - Don't require confirmation for personal/solo events

</implementation>

<output>
Modify these files (reference analysis for exact locations):
- `prisma/schema.prisma` - if schema changes needed
- `src/components/ClientSelector.tsx` - clear client-only selection
- `src/components/EventCreationModal.tsx` - separate client/participant UI
- `src/components/EventDetailsModal.tsx` - display both correctly
- `src/components/RescheduleConfirmationModal.tsx` - conditional display logic
- Related API routes if data fetching needs adjustment
</output>

<verification>
Test these scenarios:
- [ ] Create event with client, no participants → reschedule should NOT show confirmation
- [ ] Create event with participants → reschedule SHOULD show confirmation
- [ ] Create personal event (no client, no participants) → reschedule should NOT show confirmation
- [ ] ClientSelector only shows CRM clients, not event attendees
- [ ] Event details clearly shows "Client: X" separate from "Participants: A, B, C"
- [ ] TypeScript compilation passes with no type errors
- [ ] Run `npx prisma migrate dev` if schema changed
</verification>

<success_criteria>
- Clear separation between Client and Participant in code and UI
- Reschedule confirmation ONLY appears for events with participants
- No TypeScript errors related to client/participant types
- Database relationships correctly model the real-world distinction
</success_criteria>
