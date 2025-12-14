# Client vs Participant - Visual Guide

## 🎯 The Core Distinction

```
┌─────────────────────────────────────────────────────────────┐
│                         EVENT                                │
│                                                              │
│  ┌────────────────────┐        ┌─────────────────────────┐  │
│  │      CLIENT        │        │     PARTICIPANTS        │  │
│  │                    │        │                         │  │
│  │  Who it's FOR      │        │  Who is ATTENDING       │  │
│  │  (CRM Contact)     │        │  (Meeting Attendees)    │  │
│  │                    │        │                         │  │
│  │  Example:          │        │  Example:               │  │
│  │  "Acme Corp"       │        │  - john@acme.com        │  │
│  │                    │        │  - jane@acme.com        │  │
│  │                    │        │  - bob@acme.com         │  │
│  └────────────────────┘        └─────────────────────────┘  │
│                                                              │
│  ⚠️  These are DIFFERENT concepts!                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Event Type Examples

### Example 1: Client Meeting
```
┌──────────────────────────────────────────┐
│ Event: "Quarterly Business Review"      │
├──────────────────────────────────────────┤
│ Client: "Acme Corporation"               │
│ (This meeting is FOR Acme)               │
│                                          │
│ Participants:                            │
│  ✓ john@acmecorp.com (Client CEO)        │
│  ✓ jane@acmecorp.com (Client CFO)        │
│  ✓ you@yourcompany.com (You)             │
│                                          │
│ Reschedule Modal: YES ✅                 │
│ (Participants need notification)         │
└──────────────────────────────────────────┘
```

### Example 2: Solo Task for Client
```
┌──────────────────────────────────────────┐
│ Event: "Prepare Acme Proposal"           │
├──────────────────────────────────────────┤
│ Client: "Acme Corporation"               │
│ (This task is FOR Acme)                  │
│                                          │
│ Participants: [none]                     │
│ (Just you working alone)                 │
│                                          │
│ Reschedule Modal: NO ❌                  │
│ (No one to notify)                       │
└──────────────────────────────────────────┘
```

### Example 3: Personal Event
```
┌──────────────────────────────────────────┐
│ Event: "Dentist Appointment"             │
├──────────────────────────────────────────┤
│ Client: "Personal"                       │
│ (For yourself)                           │
│                                          │
│ Participants: [none]                     │
│ (Solo appointment)                       │
│                                          │
│ Reschedule Modal: NO ❌                  │
│ (No one to notify)                       │
└──────────────────────────────────────────┘
```

### Example 4: Team Meeting (No Client)
```
┌──────────────────────────────────────────┐
│ Event: "Weekly Team Standup"             │
├──────────────────────────────────────────┤
│ Client: [optional or "Internal"]         │
│                                          │
│ Participants:                            │
│  ✓ alice@team.com                        │
│  ✓ bob@team.com                          │
│  ✓ carol@team.com                        │
│                                          │
│ Reschedule Modal: YES ✅                 │
│ (Team members need notification)         │
└──────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Before (Wrong)
```
Event Created
    ↓
Client field populated
    ↓
❌ Client treated as participant
    ↓
❌ Reschedule modal ALWAYS shows
    ↓
❌ Client gets notification (wrong!)
```

### After (Correct)
```
Event Created
    ↓
Client field (who it's FOR)
    ↓
Participants array (who's ATTENDING)
    ↓
Check: participants.length > 0?
    ├─ YES → Show reschedule modal ✅
    └─ NO  → Direct reschedule (no modal) ✅
    ↓
Only participants get notifications ✅
```

---

## 🎨 UI Changes

### Event Creation Modal - Before
```
┌────────────────────────────┐
│ Client: [_____________]    │  ← Confusing!
│                            │     Used for BOTH
│                            │     client AND attendees
└────────────────────────────┘
```

### Event Creation Modal - After
```
┌────────────────────────────────────────────┐
│ Client (Who is this for?):                 │
│ [Acme Corporation____________]             │  ← Clear!
│                                            │
│ ─────────────────────────────────────────  │
│                                            │
│ Participants (Who is attending?):          │
│ [john@acmecorp.com_________] [×]           │  ← Separate!
│ [jane@acmecorp.com_________] [×]           │
│ [+ Add Participant]                        │
└────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Event Table
```sql
┌──────────────────────────────────────────────────┐
│                Event Table                       │
├──────────────────────────────────────────────────┤
│ id               VARCHAR                         │
│ title            VARCHAR                         │
│ startDateTime    VARCHAR                         │
│ endDateTime      VARCHAR                         │
│                                                  │
│ -- Client (who it's FOR)                        │
│ clientId         VARCHAR  ← CRM relationship    │
│ clientName       VARCHAR  ← Display name        │
│                                                  │
│ -- Participants (who's ATTENDING)               │
│ participants     JSONB    ← ['email1', 'email2']│
│                  ↑                               │
│                  └─ NEW FIELD!                   │
└──────────────────────────────────────────────────┘
```

---

## ⚙️ Reschedule Logic

```
┌─────────────────────────────────────────────┐
│         User Drags Event to New Time        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ Check Participants  │
        │ Array               │
        └─────────┬───────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
   ┌─────────┐      ┌──────────┐
   │ Empty   │      │ Has      │
   │ Array   │      │ Items    │
   └────┬────┘      └────┬─────┘
        │                │
        ▼                ▼
   ┌─────────────┐  ┌──────────────────┐
   │ Direct      │  │ Show             │
   │ Reschedule  │  │ Confirmation     │
   │ ✅          │  │ Modal            │
   └─────────────┘  │ ✅               │
                    │                  │
                    │ Allow user to:   │
                    │ - Add reason     │
                    │ - Toggle notify  │
                    │ - Confirm/Cancel │
                    └──────────────────┘
```

---

## 📱 User Experience

### Scenario: Solo Task
```
1. User creates task: "Prepare report for Acme"
2. Sets client: "Acme Corp"
3. Leaves participants empty
4. Drags task to tomorrow
5. ✅ Task moves immediately (no modal!)
6. ✅ No unnecessary clicks
```

### Scenario: Client Meeting
```
1. User creates event: "Acme Q1 Review"
2. Sets client: "Acme Corp"
3. Adds participants:
   - john@acmecorp.com
   - jane@acmecorp.com
4. Drags meeting to tomorrow
5. ⚠️  Modal appears: "Confirm reschedule?"
6. ✅ User can notify participants
7. ✅ Optional: Add reason for change
```

---

## 🎓 Key Takeaways

1. **Client** = Business relationship (stored in CRM)
2. **Participants** = Meeting attendees (array of emails/names)
3. **Modal shows** = Only when participants exist
4. **Notifications sent** = Only to participants, not clients
5. **Backward compatible** = Existing events work fine

---

**Questions?** See `CLIENT_PARTICIPANT_FIX_SUMMARY.md` for details.
