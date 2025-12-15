<objective>
Fix the Google Calendar integration status display in the preferences panel. Currently, the button shows "Connect" even when Google Calendar is already connected via the API. The UI should accurately reflect the connection state and provide clear visual feedback to users.
</objective>

<context>
This is the evangelo-sommer becky-crm web app built with Next.js, React, and Prisma. The user has previously connected their Google Calendar integration, and the Google Calendar API confirms the connection exists with the CRM. However, the preferences panel UI incorrectly shows "Connect" as if no connection exists.

Key files to examine:
- `./src/components/PreferencesModal.tsx` - Contains the preferences panel UI
- `./src/components/CalendarIntegrationManager.tsx` - Manages calendar integration logic
- `./src/app/api/` - API routes that may handle calendar connection status
- Any Google Calendar related hooks or services
</context>

<research>
Before making changes, investigate:

1. **Connection State Flow**: Trace how the Google Calendar connection status is determined
   - Where is the connection state stored? (database, session, API response)
   - How does the frontend fetch/receive connection status on load?
   - Is there an API endpoint that checks Google Calendar connection?

2. **Dev Server Launch**: Determine if/how Google Calendar API connection is verified on dev server startup
   - Check for any initialization logic in API routes or server components
   - Look for OAuth token validation or refresh logic

3. **Current UI Logic**: Examine PreferencesModal and CalendarIntegrationManager to understand:
   - What state/props control the "Connect" vs "Disconnect" button text
   - What conditions determine the displayed connection status
   - Why the state might not be updating correctly
</research>

<requirements>
1. **Investigate Root Cause**: Determine why the button shows "Connect" when already connected
   - Check if connection status is being fetched on component mount
   - Verify the API returns correct connection state
   - Identify any race conditions or state initialization issues

2. **Fix Connection Status Display**: Update the UI to correctly show:
   - "Disconnect" button when Google Calendar IS connected
   - "Connect" button when Google Calendar is NOT connected

3. **Add Visual Connection Indicator**: When connected, display:
   - A green marker/dot/badge indicating "online/connected" status
   - Optional: Brief status text like "Connected" or "Synced" if space permits

4. **Ensure Status Persistence**: The connection status should:
   - Load correctly on initial page/modal open
   - Update after connect/disconnect actions
   - Reflect actual API connection state
</requirements>

<implementation>
Approach:
1. First, read and understand the current implementation in PreferencesModal.tsx and CalendarIntegrationManager.tsx
2. Trace the connection status data flow from API to UI
3. Identify the specific bug causing incorrect status display
4. Fix the root cause (likely state initialization or API call timing)
5. Add visual indicators for connected state

For the visual indicator, consider:
- A small green circle/dot next to the integration name
- Using existing design system colors/components for consistency
- Tailwind classes like `bg-green-500` for the indicator
- Text like "Connected" in a muted style near the button

Avoid:
- Adding new dependencies for simple visual indicators
- Breaking existing connect/disconnect functionality
- Modifying unrelated preferences panel sections
</implementation>

<output>
Modify files as needed:
- `./src/components/PreferencesModal.tsx` - Update UI to show correct connection state
- `./src/components/CalendarIntegrationManager.tsx` - Fix connection status logic if needed
- Any API routes if the issue is backend-related
</output>

<verification>
Before declaring complete, verify:
1. Launch dev server and open preferences panel
2. Confirm Google Calendar shows "Disconnect" button (since already connected)
3. Confirm green indicator is visible showing connected status
4. Test disconnect flow - button should change to "Connect" and green indicator should disappear
5. Test reconnect flow - verify status updates correctly
6. Refresh page and confirm status persists correctly
</verification>

<success_criteria>
- Google Calendar integration correctly shows "Disconnect" when connected
- Green visual indicator displays when connected
- Status text shows "Connected" or similar when appropriate
- Button state and visual indicators update correctly after connect/disconnect actions
- Status loads correctly on initial modal open without requiring user interaction
</success_criteria>
