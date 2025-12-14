# Next Steps - Calendar Sync Implementation

## ✅ What's Been Completed

Real-time bidirectional calendar synchronization is now **fully implemented** and ready to deploy. Here's what was built:

### Core Infrastructure
- ✅ Database schema with EventSync, SyncQueue models
- ✅ Calendar sync orchestration service
- ✅ Google Calendar webhook receiver (real-time push)
- ✅ Notion polling endpoint (1-2 min sync)
- ✅ Retry queue with exponential backoff
- ✅ UI components (SyncStatusIndicator)
- ✅ React hooks (useCalendarSync)
- ✅ Event API integration
- ✅ Complete documentation

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```bash
npx prisma migrate dev --name add-calendar-sync
```

This will create:
- `EventSync` table (tracks sync status)
- `SyncQueue` table (retry queue)
- New columns in `CalendarIntegration`
- New enums (SyncStatus, SyncDirection, etc.)

**Expected output:**
```
✔ Generated Prisma Client
✔ Migration applied successfully
```

### Step 2: Verify Environment Variables

Ensure these are in your `.env`:

```bash
# Google OAuth (should already exist)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# App URL for webhooks
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encryption (should already exist)
ENCRYPTION_KEY=...
```

### Step 3: Test Basic Sync

1. **Create an event in the app:**
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Sync Event",
    "startDateTime": "2025-01-15T10:00:00Z",
    "endDateTime": "2025-01-15T11:00:00Z",
    "type": "event",
    "priority": "medium",
    "duration": 60
  }'
```

2. **Check if it synced to Google Calendar:**
   - Open Google Calendar
   - Look for "Test Sync Event" on Jan 15, 2025
   - Should appear within 1-2 seconds

3. **Check sync status in database:**
```sql
SELECT * FROM "EventSync" ORDER BY "createdAt" DESC LIMIT 5;
```

Should show status = 'SYNCED' and have a Google event ID.

### Step 4: Set Up Google Calendar Webhooks (Optional but Recommended)

For real-time sync FROM Google TO app:

1. **Register webhook for an integration:**
```bash
curl -X PUT http://localhost:3000/api/calendar/webhooks/google \
  -H "Content-Type: application/json" \
  -d '{
    "integrationId": "YOUR_INTEGRATION_ID"
  }'
```

Replace `YOUR_INTEGRATION_ID` with actual integration ID from database.

2. **For production (public URL required):**
   - Update `NEXT_PUBLIC_APP_URL` to your production domain
   - Webhook endpoint must be publicly accessible
   - For local testing, use ngrok:
     ```bash
     ngrok http 3000
     # Use ngrok URL as NEXT_PUBLIC_APP_URL
     ```

3. **Set up auto-renewal (webhooks expire after 7 days):**
   - Create a cron job or Vercel cron function
   - See `CALENDAR_SYNC_SETUP.md` for details

### Step 5: Set Up Notion Sync (If Using Notion)

1. **Configure Notion database:**
   - Create a Notion database with these properties:
     - Title (title)
     - Date (date)
     - Description (rich_text)
     - Location (rich_text)
     - Notes (rich_text)

2. **Test Notion sync:**
```bash
curl -X POST http://localhost:3000/api/calendar/sync/notion/pull \
  -H "Content-Type: application/json" \
  -d '{
    "integrationId": "YOUR_NOTION_INTEGRATION_ID",
    "databaseId": "YOUR_NOTION_DATABASE_ID"
  }'
```

3. **Set up polling cron (every 2 minutes):**
   - Add to crontab or Vercel cron
   - See `CALENDAR_SYNC_SETUP.md` for configuration

### Step 6: Set Up Sync Queue Processor

For automatic retry of failed syncs:

```bash
# Process queue every 5 minutes
curl -X POST http://localhost:3000/api/calendar/sync/queue
```

Set this up as a cron job or Vercel cron function.

### Step 7: Add UI Components

In your calendar view component:

```typescript
// Example: src/app/calendar/page.tsx or src/components/ScheduleCalendar.tsx

import { useCalendarSync } from '@/hooks/useCalendarSync'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'

export function CalendarView() {
  const { syncStatuses, syncAll, isSyncing } = useCalendarSync({
    autoSync: true,      // Enable auto-sync
    syncInterval: 60000  // Sync every minute
  })

  return (
    <div>
      {/* Add sync status indicator to top-right of calendar */}
      <div className="absolute top-4 right-4">
        <SyncStatusIndicator
          integrations={syncStatuses}
          onManualSync={syncAll}
          compact={true}
        />
      </div>

      {/* Your existing calendar UI */}
      <YourCalendarComponent />
    </div>
  )
}
```

## 🧪 Testing Checklist

### App → Google Calendar (Push)
- [ ] Create event in app → check Google Calendar
- [ ] Update event time → Google Calendar reflects change
- [ ] Delete event → removed from Google Calendar

### Google Calendar → App (Pull - requires webhook)
- [ ] Create event in Google → check app database
- [ ] Update event in Google → app database updates
- [ ] Delete event in Google → removed from app

### Notion Integration (if configured)
- [ ] Create event in app → Notion page created
- [ ] Create page in Notion → event appears in app (2 min delay)

### Error Handling
- [ ] Disconnect internet → event queued for retry
- [ ] Reconnect internet → queue processor syncs event
- [ ] Check SyncQueue table for failed items

### UI
- [ ] SyncStatusIndicator shows correct status
- [ ] Manual sync button works
- [ ] Error messages display correctly

## 📊 Monitoring

### Check Integration Status
```bash
curl http://localhost:3000/api/calendar/integrations
```

Look for:
- `lastSyncAt` - should be recent
- `lastSyncError` - should be null
- `isActive` - should be true

### Check Queue Status
```bash
curl http://localhost:3000/api/calendar/sync/queue
```

Look for:
- Low PENDING count (< 10)
- High COMPLETED count
- Low FAILED count (0 ideally)

### Check Database Directly
```sql
-- Recent syncs
SELECT e.title, es.provider, es.syncStatus, es.lastSyncAt
FROM "Event" e
JOIN "EventSync" es ON e.id = es.eventId
ORDER BY es.lastSyncAt DESC
LIMIT 10;

-- Failed syncs
SELECT * FROM "SyncQueue"
WHERE status = 'FAILED'
ORDER BY createdAt DESC;
```

## 🐛 Troubleshooting

### Sync Not Working

1. **Check logs:**
   - Look for `📅 [CalendarSync]` messages in console
   - Check for errors in API responses

2. **Verify integration is active:**
```sql
SELECT * FROM "CalendarIntegration" WHERE isActive = true;
```

3. **Check token expiry:**
```sql
SELECT provider, expiresAt FROM "CalendarIntegration";
```

4. **Process queue manually:**
```bash
curl -X POST http://localhost:3000/api/calendar/sync/queue
```

### Google Webhook Not Working

1. **Check webhook registration:**
```sql
SELECT webhookId, webhookExpiry FROM "CalendarIntegration" WHERE provider = 'GOOGLE';
```

2. **Webhook expired?**
   - Re-register using PUT endpoint
   - Set up auto-renewal cron

3. **Public URL not accessible?**
   - Use ngrok for local testing
   - Verify firewall allows incoming connections

### Events Duplicating

1. **Check for duplicate EventSync records:**
```sql
SELECT eventId, COUNT(*) FROM "EventSync"
GROUP BY eventId HAVING COUNT(*) > 1;
```

2. **Delete duplicates:**
```sql
DELETE FROM "EventSync" WHERE id IN (
  SELECT id FROM "EventSync"
  WHERE (eventId, integrationId) IN (
    SELECT eventId, integrationId FROM "EventSync"
    GROUP BY eventId, integrationId HAVING COUNT(*) > 1
  )
  AND id NOT IN (
    SELECT MIN(id) FROM "EventSync"
    GROUP BY eventId, integrationId
  )
);
```

## 📚 Documentation Reference

- **`CALENDAR_SYNC_SETUP.md`** - Detailed setup instructions
- **`CALENDAR_SYNC_IMPLEMENTATION.md`** - Technical implementation details
- **`analyses/calendar-system-analysis.md`** - Original system analysis

## 🔐 Security Checklist

- [ ] All OAuth tokens encrypted in database
- [ ] Environment variables not committed to git
- [ ] Webhook endpoints validate requests
- [ ] API endpoints require authentication
- [ ] Token refresh handled automatically

## 🚨 Before Production

1. **Change NEXT_PUBLIC_APP_URL** to production domain
2. **Set up production cron jobs** (Vercel Cron, AWS EventBridge, etc.)
3. **Configure Google OAuth** production credentials
4. **Test webhook renewal** process
5. **Set up monitoring/alerting** for sync failures
6. **Backup database** before running migration

## ⏭️ Future Enhancements

Consider adding later:
- [ ] Conflict resolution UI (show user local vs remote)
- [ ] Sync analytics dashboard
- [ ] Selective calendar sync (choose which calendars)
- [ ] Microsoft Outlook integration
- [ ] Apple iCloud calendar support
- [ ] Bulk sync operations
- [ ] Sync history/audit log

## 📞 Need Help?

1. Review `CALENDAR_SYNC_SETUP.md` troubleshooting section
2. Check database tables: `EventSync`, `SyncQueue`
3. Look for `📅 [CalendarSync]` logs
4. Test manually with curl commands

## ✨ Success Criteria

You'll know it's working when:
- ✅ Creating event in app appears in Google Calendar within 2 seconds
- ✅ Creating event in Google Calendar appears in app within 5 seconds (with webhook)
- ✅ SyncStatusIndicator shows "synced" status
- ✅ EventSync table shows SYNCED records
- ✅ SyncQueue has low PENDING count

---

**Status**: ✅ Ready for deployment
**Next Action**: Run `npx prisma migrate dev --name add-calendar-sync`
**Estimated Setup Time**: 15-30 minutes
