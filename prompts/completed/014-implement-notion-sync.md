<objective>
Implement full bidirectional sync functionality for Notion calendar/task integration.

Currently, all Notion sync functions are stubs that return "Not implemented" errors. The OAuth connection works, but no actual sync happens. Implement complete inbound and outbound sync for Notion.
</objective>

<context>
This is the fourth and final step in fixing calendar sync. The previous prompts fixed Google Calendar sync - now apply similar patterns to Notion.

Key files:
- @src/lib/calendar-sync.ts - Contains stub Notion functions to implement
- @src/lib/calendar-service.ts - Calendar service patterns
- @prisma/schema.prisma - Event and integration models
- @analyses/calendar-sync-investigation.md - Investigation findings

The Notion integration should sync with a Notion database that has date properties. Users configure which database to sync with during integration setup.

Notion API client is already installed: `@notionhq/client`
</context>

<requirements>
1. **Implement `pullFromNotion()`** - Inbound sync
   - Query the configured Notion database
   - Map Notion pages to Event records
   - Create/update Events in database
   - Create EventSync records for mapping
   - Handle Notion's date property format

2. **Implement `pushToNotion()`** - Outbound sync
   - Find local events not yet synced to Notion
   - Create pages in Notion database for new events
   - Update existing Notion pages for modified events
   - Update EventSync records with Notion page IDs

3. **Implement `deleteFromNotion()`** - Deletion propagation
   - Delete or archive Notion pages when local events are deleted
   - Clean up EventSync records

4. **Handle Notion database schema detection**
   - Query database to understand its properties
   - Map required fields: title, date/datetime, description
   - Handle optional fields gracefully

5. **Error handling**
   - Notion API rate limits (handle 429 responses)
   - Missing database permissions
   - Invalid database ID configuration
   - Token expiration/refresh
</requirements>

<implementation>
Reference Notion API patterns:

```typescript
import { Client } from '@notionhq/client';

async function pullFromNotion(integration: CalendarIntegration) {
  const notion = new Client({ auth: integration.accessToken });

  // Query database for pages with dates
  const response = await notion.databases.query({
    database_id: integration.notionDatabaseId,
    filter: {
      property: 'Date', // or detected date property name
      date: { is_not_empty: true }
    }
  });

  for (const page of response.results) {
    // Extract properties
    const title = getPageTitle(page);
    const dateRange = getDateProperty(page);

    // Upsert to database with EventSync tracking
    // (similar pattern to Google sync)
  }
}

async function pushToNotion(event: Event, integration: CalendarIntegration) {
  const notion = new Client({ auth: integration.accessToken });

  await notion.pages.create({
    parent: { database_id: integration.notionDatabaseId },
    properties: {
      title: { title: [{ text: { content: event.title } }] },
      Date: { date: { start: event.startDateTime.toISOString() } },
      // Map other properties
    }
  });
}
```

Rate limit handling:
```typescript
async function notionApiCall(fn: () => Promise<any>, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (error.code === 'rate_limited' && retries > 0) {
      await sleep(error.headers['retry-after'] * 1000 || 1000);
      return notionApiCall(fn, retries - 1);
    }
    throw error;
  }
}
```
</implementation>

<output>
Modify these files:
- `./src/lib/calendar-sync.ts` - Implement Notion sync functions
- `./src/app/api/calendar/notion/sync/route.ts` - Create if needed for Notion-specific sync endpoint

May also need:
- `./src/lib/notion-helpers.ts` - Helper functions for Notion property extraction
</output>

<verification>
Before completing:
- [ ] Events from configured Notion database appear in Time Manager
- [ ] New events created in Time Manager appear in Notion
- [ ] Deleted events are removed/archived in Notion
- [ ] Rate limits are handled gracefully
- [ ] Missing database permissions show clear error
- [ ] Code compiles without TypeScript errors
</verification>

<success_criteria>
- Bidirectional sync works between Time Manager and Notion
- Events can be created, updated, and deleted in either place
- EventSync records properly track Notion page IDs
- No more "Not implemented" errors for Notion operations
- Integration feels as reliable as Google Calendar sync
</success_criteria>
</content>
