<objective>
Implement real-time bidirectional calendar synchronization between the application, Google Calendar, and Notion databases.

Changes made in the app should sync to external calendars, and changes made in Google Calendar or Notion should sync back to the app - all in real-time or near-real-time.
</objective>

<context>
Prerequisites: Run prompts 001-003 first.

Tech stack:
- Next.js 15 API routes
- Prisma ORM for database
- googleapis package (installed) for Google Calendar API
- Notion API for Notion integration
- Existing calendar integration code to build upon

Reference `./analyses/calendar-system-analysis.md` for current sync status.
</context>

<requirements>

## Bidirectional Sync Architecture

### App → External (Push)
When events are created/updated/deleted in the app:
1. Save to local database (optimistic)
2. Push to Google Calendar (if connected)
3. Push to Notion (if connected)
4. Handle failures with retry queue

### External → App (Pull)
When events change externally:
1. **Google Calendar**: Use push notifications (webhooks) or polling
2. **Notion**: Use polling (Notion doesn't support webhooks for databases)
3. Merge changes into local database
4. Handle conflicts (last-write-wins or user prompt)

## Google Calendar Integration

1. **OAuth Setup**
   - Ensure proper scopes: `calendar.events`, `calendar.readonly`
   - Store refresh tokens securely
   - Handle token refresh automatically

2. **Push Sync (App → Google)**
   ```typescript
   // On event create/update/delete
   await googleCalendar.events.insert/patch/delete({
     calendarId: 'primary',
     resource: convertToGoogleEvent(localEvent)
   });
   ```

3. **Pull Sync (Google → App)**
   - Option A: Google Push Notifications (preferred)
     - Set up webhook endpoint
     - Receive change notifications
     - Fetch changed events
   - Option B: Polling fallback
     - Poll every 30-60 seconds
     - Use syncToken for incremental sync

4. **Event Mapping**
   ```typescript
   interface EventMapping {
     localId: string;
     googleEventId?: string;
     notionPageId?: string;
     lastSyncedAt: Date;
     syncStatus: 'synced' | 'pending' | 'error';
   }
   ```

## Notion Integration

1. **Database Setup**
   - Identify/create Notion database for events
   - Map properties: Title, Date, Time, Description, Status

2. **Push Sync (App → Notion)**
   ```typescript
   await notion.pages.create/update({
     parent: { database_id: NOTION_DATABASE_ID },
     properties: convertToNotionProperties(localEvent)
   });
   ```

3. **Pull Sync (Notion → App)**
   - Poll Notion database periodically (every 1-2 minutes)
   - Query for pages modified since last sync
   - Use `last_edited_time` filter

## Conflict Resolution

When same event modified in multiple places:
1. Compare timestamps
2. Last-write-wins (default)
3. Optionally: prompt user for resolution

## Real-Time UX

1. **Optimistic Updates**
   - UI updates immediately
   - Background sync happens async
   - Show sync status indicator

2. **Sync Status Indicator**
   - Small icon showing: synced ✓, syncing ↻, error ⚠
   - Tooltip with last sync time
   - Click to manually trigger sync

3. **Error Handling**
   - Toast notifications for sync failures
   - Retry queue for failed operations
   - Manual retry option

</requirements>

<implementation>

## API Routes Structure

```
src/app/api/calendar/
├── sync/
│   ├── google/
│   │   ├── push/route.ts      # Receive Google webhooks
│   │   ├── pull/route.ts      # Manual pull trigger
│   │   └── callback/route.ts  # OAuth callback
│   └── notion/
│       ├── pull/route.ts      # Poll Notion changes
│       └── push/route.ts      # Push to Notion
├── events/
│   └── [id]/route.ts          # CRUD triggers sync
└── webhook/
    └── google/route.ts        # Google push notification endpoint
```

## Sync Service Pattern

```typescript
// src/lib/calendar-sync.ts
export class CalendarSyncService {
  async syncToGoogle(event: CalendarEvent): Promise<void>;
  async syncToNotion(event: CalendarEvent): Promise<void>;
  async pullFromGoogle(userId: string): Promise<CalendarEvent[]>;
  async pullFromNotion(userId: string): Promise<CalendarEvent[]>;
  async reconcileChanges(local: Event[], remote: Event[]): Promise<void>;
}
```

## Database Schema Additions

```prisma
model CalendarIntegration {
  id            String   @id @default(cuid())
  userId        String
  provider      String   // 'google' | 'notion'
  accessToken   String
  refreshToken  String?
  externalId    String?  // calendar ID or database ID
  syncToken     String?  // for incremental sync
  lastSyncAt    DateTime?
  user          User     @relation(fields: [userId], references: [id])
}

model EventSync {
  id            String   @id @default(cuid())
  eventId       String
  provider      String
  externalId    String   // Google event ID or Notion page ID
  syncStatus    String   // 'synced' | 'pending' | 'error'
  lastSyncAt    DateTime
  event         Event    @relation(fields: [eventId], references: [id])
}
```

## Background Sync Job

For Notion polling (no webhooks available):
```typescript
// Use Vercel Cron or similar
// vercel.json or next.config.js cron config
// Runs every 1-2 minutes to check for Notion changes
```

</implementation>

<output>
Create/modify files:
- `prisma/schema.prisma` - Add sync-related models
- `src/lib/calendar-sync.ts` - Main sync service
- `src/lib/google-calendar.ts` - Google Calendar helpers
- `src/lib/notion-calendar.ts` - Notion integration helpers
- `src/app/api/calendar/sync/google/push/route.ts` - Google webhook receiver
- `src/app/api/calendar/sync/google/pull/route.ts` - Manual Google pull
- `src/app/api/calendar/sync/notion/pull/route.ts` - Notion polling
- `src/app/api/calendar/events/[id]/route.ts` - Update to trigger sync
- `src/components/SyncStatusIndicator.tsx` - UI sync status
- `src/hooks/useCalendarSync.ts` - React hook for sync state

Run after implementation:
- `npx prisma migrate dev --name add-calendar-sync`
</output>

<verification>
Test sync scenarios:

**App → Google**
- [ ] Create event in app → appears in Google Calendar
- [ ] Update event time in app → Google Calendar updates
- [ ] Delete event in app → removed from Google Calendar

**Google → App**
- [ ] Create event in Google Calendar → appears in app
- [ ] Update event in Google Calendar → app reflects change
- [ ] Delete event in Google Calendar → removed from app

**App → Notion**
- [ ] Create event → Notion page created
- [ ] Update event → Notion page updates
- [ ] Delete event → Notion page archived/deleted

**Notion → App**
- [ ] Create page in Notion → event appears in app
- [ ] Update page → event updates in app

**Conflict Scenarios**
- [ ] Edit same event in app and Google simultaneously → resolved correctly
- [ ] Offline changes sync when back online

**Error Handling**
- [ ] API failure shows toast notification
- [ ] Failed sync retries automatically
- [ ] Sync status indicator reflects state

**Performance**
- [ ] Sync operations don't block UI
- [ ] Incremental sync (not full refresh each time)
</verification>

<success_criteria>
- Real-time bidirectional sync with Google Calendar
- Near-real-time sync with Notion (polling-based)
- UI shows sync status clearly
- Conflicts resolved gracefully
- Failures handled with retries and user notification
- All CRUD operations in app trigger external sync
- External changes reflected in app within acceptable delay
</success_criteria>
