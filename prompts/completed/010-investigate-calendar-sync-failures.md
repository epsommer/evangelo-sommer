<objective>
Perform a comprehensive root cause analysis of the calendar integration sync failures in the Becky CRM Time Manager.

The investigation must answer:
1. Why events previously created and deleted in the web app still exist in Google Calendar (deletion not propagating)
2. Why events from Google Calendar are not appearing in the web app (missing inbound sync)
3. Why newly created events in the web app are not appearing in Google Calendar or Notion (outbound sync failing)
4. Current integration status and health for both Google Calendar and Notion
</objective>

<context>
This is the Time Manager feature of the evangelosommer.com web application. The application uses:
- Next.js with API routes for backend
- Prisma for database
- Google Calendar API for calendar sync
- Notion API for calendar/task sync
- NextAuth for authentication with OAuth providers

The user has reported a broken sync state where bidirectional sync is not functioning properly for either integration.
</context>

<research>
Thoroughly analyze the following files and systems:

**Integration Configuration:**
- @src/lib/calendar-sync.ts - Core sync logic
- @src/lib/calendar-service.ts - Calendar service layer
- @src/app/api/calendar/google/sync/route.ts - Google sync API endpoint
- @src/app/api/calendar/integrations/* - Integration management endpoints

**Database Schema:**
- @prisma/schema.prisma - Event and integration models, sync tracking fields

**Frontend Integration UI:**
- @src/components/CalendarIntegrationManager.tsx - Integration management UI

**Event CRUD Operations:**
- @src/app/api/events/route.ts - Event creation/update/delete handlers
- Look for sync trigger points after event operations

**Authentication & Tokens:**
- Check OAuth token storage and refresh logic
- Verify integration credentials are valid and not expired
</research>

<analysis_requirements>
For each sync direction (inbound and outbound) and each integration (Google, Notion), determine:

1. **Token/Auth Status**: Are OAuth tokens valid? When do they expire? Is refresh working?

2. **Sync Trigger Mechanism**:
   - When is sync supposed to happen? (On event create/update/delete? Scheduled? Manual?)
   - Is the trigger actually firing?

3. **API Call Analysis**:
   - Are API calls being made to Google/Notion?
   - What responses/errors are being returned?
   - Are rate limits being hit?

4. **Data Flow Mapping**:
   - Trace the complete path from user action → database → external API
   - Identify where data is being lost or blocked

5. **External ID Tracking**:
   - How are external event IDs stored and mapped?
   - Are mappings getting out of sync?

6. **Error Handling**:
   - What errors are being caught/logged?
   - Are errors silently swallowed?

7. **Deletion Propagation**:
   - Specifically analyze the delete flow
   - Determine why Google Calendar events persist after local deletion
</analysis_requirements>

<output_format>
Create a detailed diagnostic report saved to: `./analyses/calendar-sync-investigation.md`

Structure the report as:

```markdown
# Calendar Integration Sync Investigation

## Executive Summary
[2-3 paragraph summary of findings]

## Integration Status
### Google Calendar
- Connection status: [Connected/Disconnected/Token Expired]
- Last successful sync: [timestamp or unknown]
- Token expiry: [date/time]

### Notion
- Connection status: [Connected/Disconnected/Token Expired]
- Last successful sync: [timestamp or unknown]
- Database ID configured: [yes/no]

## Root Cause Analysis

### Issue 1: Events not deleted from Google Calendar
- **Symptom**: [specific observation]
- **Root cause**: [technical explanation]
- **Evidence**: [code references, logs, data]
- **Location**: [file:line_number]

### Issue 2: Events not appearing in web app from Google Calendar
- **Symptom**: [specific observation]
- **Root cause**: [technical explanation]
- **Evidence**: [code references, logs, data]
- **Location**: [file:line_number]

### Issue 3: New events not syncing to Google Calendar
- **Symptom**: [specific observation]
- **Root cause**: [technical explanation]
- **Evidence**: [code references, logs, data]
- **Location**: [file:line_number]

### Issue 4: Events not syncing to Notion
- **Symptom**: [specific observation]
- **Root cause**: [technical explanation]
- **Evidence**: [code references, logs, data]
- **Location**: [file:line_number]

## Data Flow Diagrams
[ASCII or text-based diagrams showing expected vs actual data flow]

## Recommendations
[Numbered list of specific fixes needed, referencing exact files and functions]

## Files Analyzed
[List of all files examined with brief notes]
```
</output_format>

<verification>
Before completing the investigation:
- [ ] Traced complete sync flow for create, update, and delete operations
- [ ] Identified specific code locations where sync fails
- [ ] Verified OAuth token handling and refresh logic
- [ ] Checked for silent error swallowing
- [ ] Documented external ID mapping mechanism
- [ ] Confirmed whether sync is triggered automatically or requires manual action
- [ ] Reviewed any existing sync logs or error handling
</verification>

<success_criteria>
- All four sync failure scenarios have identified root causes
- Each root cause references specific file paths and line numbers
- Report provides actionable recommendations for fixing each issue
- Integration status (connected, token validity) is clearly documented
</success_criteria>
</content>
</invoke>