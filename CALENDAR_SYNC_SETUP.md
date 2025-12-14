# Calendar Synchronization Setup Guide

## Overview

This application now supports **real-time bidirectional calendar synchronization** between the app, Google Calendar, and Notion databases.

## Architecture

```
┌─────────────────┐
│   Application   │
│    (Events)     │
└────────┬────────┘
         │
         ├─ App → External (Push)
         │  ├─ Create/Update/Delete events
         │  ├─ Sync to Google Calendar
         │  └─ Sync to Notion
         │
         └─ External → App (Pull)
            ├─ Google: Webhooks (real-time)
            └─ Notion: Polling (1-2 min)
```

## Features

✅ **Bidirectional Sync**: Changes in app reflect in Google/Notion, and vice versa
✅ **Real-time Google Calendar**: Push notifications via webhooks
✅ **Notion Polling**: Automatic sync every 1-2 minutes
✅ **Conflict Resolution**: Last-write-wins with conflict detection
✅ **Retry Queue**: Failed syncs automatically retry with exponential backoff
✅ **Sync Status UI**: Visual indicators showing sync state

## Setup Instructions

### 1. Run Database Migration

```bash
npx prisma migrate dev --name add-calendar-sync
```

This adds the following models:
- `EventSync` - Tracks sync status for each event
- `SyncQueue` - Retry queue for failed operations
- Updated `CalendarIntegration` with webhook support

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Google Calendar OAuth (existing)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Notion API (if using Notion integration)
NOTION_API_KEY=your_notion_api_key

# App URL for webhooks
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to production URL in production

# Encryption key for tokens (existing)
ENCRYPTION_KEY=your_32_character_encryption_key

# JWT Secret (existing)
JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret
```

### 3. Google Calendar Webhook Setup

Google Calendar webhooks expire after 7 days and need renewal.

#### Register a Webhook

```bash
curl -X PUT http://localhost:3000/api/calendar/webhooks/google \
  -H "Content-Type: application/json" \
  -d '{"integrationId": "your_integration_id"}'
```

#### Auto-renewal (Recommended)

Create a cron job to renew webhooks every 6 days:

```bash
# Add to crontab (runs every 6 days at 2 AM)
0 2 */6 * * curl -X PUT http://localhost:3000/api/calendar/webhooks/google -H "Content-Type: application/json" -d '{"integrationId": "integration_id"}'
```

Or use a service like Vercel Cron:

```typescript
// pages/api/cron/renew-webhooks.ts
export default async function handler(req, res) {
  // Fetch all integrations
  // For each integration, call webhook renewal endpoint
  res.status(200).json({ success: true })
}
```

### 4. Notion Polling Setup

Notion doesn't support webhooks, so we use polling.

#### Set up a Cron Job

```bash
# Poll Notion every 2 minutes
*/2 * * * * curl -X POST http://localhost:3000/api/calendar/sync/notion/pull \
  -H "Content-Type: application/json" \
  -d '{"integrationId": "your_notion_integration_id"}'
```

#### Or use Vercel Cron

```typescript
// app/api/cron/sync-notion/route.ts
export async function GET() {
  // Fetch all Notion integrations
  // Call sync endpoint for each
  return Response.json({ success: true })
}
```

### 5. Sync Queue Processor

Process failed syncs with retry logic.

#### Set up Cron Job

```bash
# Process queue every 5 minutes
*/5 * * * * curl -X POST http://localhost:3000/api/calendar/sync/queue
```

#### Or use Background Jobs

For production, consider using:
- **Vercel Cron** (if on Vercel)
- **AWS EventBridge** (if on AWS)
- **BullMQ** (for self-hosted Redis-based queue)

## Usage

### Client-Side

```typescript
import { useCalendarSync } from '@/hooks/useCalendarSync'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'

function MyComponent() {
  const {
    syncStatuses,
    isSyncing,
    syncAll,
    error
  } = useCalendarSync({
    autoSync: true,           // Auto-sync every interval
    syncInterval: 60000,      // 1 minute
    onSyncComplete: (result) => {
      console.log('Sync completed:', result)
    }
  })

  return (
    <div>
      <SyncStatusIndicator
        integrations={syncStatuses}
        onManualSync={syncAll}
      />

      <button onClick={syncAll} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  )
}
```

### Server-Side

The sync happens automatically on event CRUD operations:

```typescript
// Create event - automatically syncs to Google/Notion
POST /api/events
{
  "title": "Meeting",
  "startDateTime": "2025-01-15T10:00:00Z",
  "endDateTime": "2025-01-15T11:00:00Z"
}

// Response includes sync status
{
  "success": true,
  "event": {...},
  "externalSync": [
    { "provider": "GOOGLE", "success": true, "externalId": "google_event_id" },
    { "provider": "NOTION", "success": true, "externalId": "notion_page_id" }
  ]
}
```

## API Endpoints

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/calendar/webhooks/google` | POST | Receive Google Calendar push notifications |
| `/api/calendar/webhooks/google` | PUT | Register new webhook |
| `/api/calendar/webhooks/google?integrationId=xxx` | DELETE | Stop webhook |

### Sync Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/calendar/integrations/:id/sync` | POST | Manual sync for an integration |
| `/api/calendar/sync/notion/pull` | POST | Pull events from Notion |
| `/api/calendar/sync/queue` | GET | Get queue status |
| `/api/calendar/sync/queue` | POST | Process sync queue |
| `/api/calendar/sync/queue?olderThan=7` | DELETE | Clean up old queue items |

### Event Operations (Auto-sync)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | POST | Create event (auto-syncs) |
| `/api/events?id=xxx` | PUT | Update event (auto-syncs) |
| `/api/events?id=xxx` | DELETE | Delete event (auto-syncs) |

## Conflict Resolution

When the same event is modified in both the app and external calendar:

**Current Strategy**: Last-write-wins
- Event with most recent `updatedAt` timestamp takes precedence

**Future Enhancement**: User prompt
```typescript
// Detect conflict
const conflict = await detectConflict(event)

if (conflict) {
  // Show UI to user
  <ConflictResolutionModal
    localVersion={conflict.localChanges}
    remoteVersion={conflict.remoteChanges}
    onResolve={(choice) => {
      // 'local', 'remote', or 'merge'
    }}
  />
}
```

## Monitoring

### Check Sync Status

```bash
curl http://localhost:3000/api/calendar/integrations
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "integration_123",
      "provider": "GOOGLE",
      "isActive": true,
      "lastSyncAt": "2025-12-14T10:30:00Z",
      "lastSyncError": null
    }
  ]
}
```

### Check Queue Status

```bash
curl http://localhost:3000/api/calendar/sync/queue
```

Response:
```json
{
  "success": true,
  "stats": {
    "PENDING": 5,
    "COMPLETED": 150,
    "FAILED": 2
  },
  "oldestPendingAge": 120000
}
```

## Troubleshooting

### Google Webhook Not Receiving Events

1. Check webhook is registered:
```bash
curl http://localhost:3000/api/calendar/integrations
# Look for webhookId and webhookExpiry
```

2. Ensure public URL is accessible:
```bash
# Google must reach your webhook endpoint
# Use ngrok for local testing
ngrok http 3000
```

3. Check webhook expiry:
- Google webhooks expire after 7 days
- Re-register using PUT endpoint

### Notion Sync Not Working

1. Verify Notion database ID:
```bash
curl "http://localhost:3000/api/calendar/sync/notion/pull?integrationId=xxx"
```

2. Check database properties:
- Must have: `Title`, `Date`, `Description`, `Location`, `Notes`
- Case-sensitive property names

3. Ensure polling cron is running:
```bash
# Check last sync time
curl http://localhost:3000/api/calendar/integrations
```

### Events Not Syncing

1. Check EventSync table:
```sql
SELECT * FROM "EventSync" WHERE "eventId" = 'event_123';
```

2. Check SyncQueue for errors:
```sql
SELECT * FROM "SyncQueue" WHERE "status" = 'FAILED';
```

3. Process queue manually:
```bash
curl -X POST http://localhost:3000/api/calendar/sync/queue
```

## Performance Considerations

- **Webhook vs Polling**: Google webhooks are instant, Notion polling has 1-2 min delay
- **Rate Limits**: Google allows 10 queries/sec, Notion allows 3/sec
- **Queue Processing**: Process queue every 5 minutes to avoid overload
- **Incremental Sync**: Uses `syncToken` for Google to only fetch changed events

## Security

- All OAuth tokens are encrypted with AES-256-GCM
- Webhook endpoints validate Google signatures
- No credentials stored in client-side code
- Token refresh handled automatically

## Next Steps

1. ✅ Run Prisma migration
2. ✅ Set up environment variables
3. ✅ Configure Google Calendar webhooks
4. ✅ Set up Notion polling cron
5. ✅ Set up sync queue processor
6. ✅ Add SyncStatusIndicator to your UI
7. ✅ Test bidirectional sync

## Support

For issues or questions:
- Check logs: `console.log` statements with `📅 [CalendarSync]` prefix
- Review database: Check `EventSync` and `SyncQueue` tables
- Test manually: Use curl commands to trigger sync endpoints
