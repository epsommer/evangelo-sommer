<objective>
Add missing connection status, sync button, and disconnect button to the Notion Calendar integration settings UI to match the Google Calendar integration interface.

Currently, when connected to Google Calendar, the settings display:
- Connection status indicator
- Sync button
- Disconnect button

The Notion Calendar integration is missing these UI elements when connected.
</objective>

<context>
The integration settings are managed in the System Preferences modal.

Key files to examine:
- `@src/components/PreferencesModal.tsx` - Main preferences modal with integration tabs
- `@src/components/CalendarIntegrationManager.tsx` - Calendar integration management component

The Google Calendar integration UI serves as the reference implementation for what Notion should look like.
</context>

<requirements>
1. **Connection Status:**
   - Show "Connected" indicator with green checkmark when Notion is linked
   - Show "Not Connected" or connection prompt when unlinked

2. **Sync Button:**
   - "Sync Now" button that triggers Notion calendar sync
   - Should show loading state during sync
   - Display last sync timestamp if available

3. **Disconnect Button:**
   - "Disconnect" button with red/warning styling
   - Confirmation dialog before disconnecting
   - Clear Notion tokens and integration data on confirm

4. **Visual Parity:**
   - Match the exact layout and styling of Google Calendar integration section
   - Use consistent button styles, spacing, and iconography
</requirements>

<implementation>
1. Review the Google Calendar integration UI in PreferencesModal/CalendarIntegrationManager
2. Identify the state variables and handlers used for Google:
   - Connection status check
   - Sync trigger function
   - Disconnect handler

3. Add equivalent functionality for Notion:
   - API call to check Notion connection status
   - Sync endpoint trigger
   - Disconnect endpoint to revoke Notion access

4. Update the UI:
   - Add connection status display
   - Add sync button with loading state
   - Add disconnect button with confirmation
</implementation>

<output>
Modify the relevant component files to add:
- Notion connection status indicator
- "Sync Now" button for Notion
- "Disconnect" button for Notion
- Match styling with Google Calendar integration section
</output>

<verification>
1. Open System Preferences → Integrations tab
2. Compare Google Calendar and Notion Calendar sections visually
3. Verify connection status updates correctly when connected/disconnected
4. Test sync button triggers Notion sync
5. Test disconnect button properly revokes access
</verification>

<success_criteria>
- Notion integration section has identical UI elements as Google Calendar
- Connection status accurately reflects Notion integration state
- Sync button successfully triggers Notion calendar sync
- Disconnect button properly removes Notion integration with confirmation
- Visual styling is consistent between both integration sections
</success_criteria>
