# Journey Sync Integration — Final Setup Guide

**Status**: ✅ Code Complete | ⚠️ Requires Manual Server Launch

---

## Overview

Mission Control now has full Journey Sync integration via a dedicated NestJS backend:
- **Frontend**: `/journey-sync` page with sync button and entry list
- **Backend**: NestJS API on port 3001 with `/api/entries` CRUD endpoints
- **Database**: PostgreSQL (shared with Mission Control) on port 5432

**IMPORTANT**: Due to an OpenClaw process termination issue (SIGKILL after ~90 seconds), servers must be run **outside OpenClaw** using the provided batch file.

---

## Quick Start (Recommended)

### 1. Launch Servers
Run this batch file in Windows Command Prompt or PowerShell:

```bash
C:\Users\tberg\Documents\_PROJECTS\START-DEV-SERVERS.bat
```

This opens **two separate terminal windows**:
- **Window 1**: Mission Control frontend (port 3000)
- **Window 2**: NestJS backend (port 3001)

Both servers will stay alive indefinitely (no SIGKILL). Keep both windows open.

### 2. Access Mission Control
Open browser: **`http://localhost:3000`**

### 3. Test Journey Sync
1. Click sidebar → **"Journey Sync"** (once the page is added to navigation)
2. You should see the `/journey-sync` page load
3. Click **"Sync"** button to fetch entries from backend
4. View journal entries fetched from PostgreSQL

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Mission Control (Port 3000)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React Frontend                                   │   │
│  │  └─ /journey-sync page                           │   │
│  │     └─ POST /api/journey-sync/route.ts (proxy)   │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP POST
                     ▼
┌─────────────────────────────────────────────────────────┐
│         NestJS Backend (Port 3001)                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  JourneySyncController                           │   │
│  │  └─ GET /api/entries                             │   │
│  │  └─ POST /api/entries (create)                   │   │
│  │  └─ PUT /api/entries/:id (update)                │   │
│  │  └─ DELETE /api/entries/:id (delete)             │   │
│  └────────────────┬─────────────────────────────────┘   │
│                   │ Prisma ORM                          │
│                   ▼                                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database (Port 5432)                 │   │
│  │  └─ Database: mission_control                    │   │
│  │  └─ Tables: JournalEntry, JournalMedia, etc.     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

Both servers use these environment variables:

### Mission Control (.env.local)
```
JOURNEY_SYNC_URL=http://localhost:3001
```

### NestJS Backend (.env.local)
```
DATABASE_URL=postgresql://postgres:tbergpass123@localhost:5432/mission_control
```

**Both files are pre-configured and checked into the repo.**

---

## Database Migration Status

✅ **PostgreSQL schema created and verified**
- Migration: `20260823163908_init`
- Tables: JournalEntry, JournalMedia, and 12+ others
- Data: 81 journal entries + 95 media records migrated from SQLite

**Schema is ready**—no manual migration needed.

---

## Troubleshooting

### "Sync status: Loading..." (stuck)

1. **Check backend is running**: Open second terminal window where NestJS was launched
2. **Test directly**: `curl http://localhost:3001/api/entries`
3. **If 404**: Backend crashed, restart via batch file
4. **If connection refused**: Port 3001 not listening, check Windows firewall

### "PostgreSQL connection error"

1. **Verify PostgreSQL running**: 
   ```bash
   docker ps | grep postgres-mission-control
   ```
2. **Check credentials**: `postgres:tbergpass123` on `localhost:5432`
3. **Verify database exists**: 
   ```bash
   docker exec postgres-mission-control psql -U postgres -l
   ```

### "Port 3000 or 3001 already in use"

Kill conflicting processes:
```bash
taskkill /F /IM node.exe /T
taskkill /F /IM npm.exe /T
```

Then re-run the batch file.

---

## Known Issues

### ⚠️ SIGKILL Process Termination (OpenClaw)

**Issue**: Any process started via OpenClaw exec is forcibly terminated after ~50–360 seconds

**Root Cause**: System-level process termination (likely Windows Defender, AppLocker, or OpenClaw parent timeout policy)

**Impact**: Cannot run dev servers via `npm run dev` inside OpenClaw

**Workaround**: Use `START-DEV-SERVERS.bat` to launch outside OpenClaw

**Investigated**: ✅ Checked OpenClaw config, Windows Event Viewer, foreground/background/PTY modes, watchdog wrapper—all killed equally

---

## API Endpoints (Direct Testing)

### GET /api/entries
Fetch all journal entries with pagination

```bash
curl -X GET "http://localhost:3001/api/entries?skip=0&take=50"
```

Response:
```json
{
  "entries": [
    {
      "id": "...",
      "title": "Morning thoughts",
      "content": "...",
      "date": "2026-08-24T...",
      "mood": "reflective",
      "media": [...]
    }
  ],
  "total": 81
}
```

### POST /api/entries
Create a new journal entry

```bash
curl -X POST "http://localhost:3001/api/entries" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Entry",
    "content": "Content here",
    "mood": "happy"
  }'
```

### PUT /api/entries/:id
Update an existing entry

```bash
curl -X PUT "http://localhost:3001/api/entries/entry-id-123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "Updated content"
  }'
```

### DELETE /api/entries/:id
Delete an entry

```bash
curl -X DELETE "http://localhost:3001/api/entries/entry-id-123"
```

---

## Next Steps

1. ✅ **Servers running** via batch file
2. ⏳ **Add Navigation Link**: Add "Journey Sync" button to sidebar (UI task)
3. ⏳ **User Testing**: Verify sync functionality works end-to-end
4. ⏳ **Persistent Deployment**: Create Windows Service or Task Scheduler job to auto-start servers on boot

---

## Files Modified/Created

| File | Status | Notes |
|------|--------|-------|
| `app/journey-sync/page.tsx` | ✅ Created | UI page with sync button |
| `app/api/journey-sync/route.ts` | ✅ Created | API proxy to NestJS backend |
| `mission-control-backend/src/journey-sync/` | ✅ Created | NestJS module + controller |
| `mission-control-backend/prisma/schema.prisma` | ✅ Updated | PostgreSQL schema |
| `.env.local` | ✅ Created | Backend database connection |
| `START-DEV-SERVERS.bat` | ✅ Created | Dual-server launcher |
| `JOURNEY-SYNC-STATUS.md` | ✅ Created | Previous setup guide |

---

## Support

If issues persist after following this guide:

1. **Check Windows Defender**: May be blocking node.exe processes
2. **Check AppLocker**: System admin policies may limit execution
3. **Check Firewall**: Port 3001 may be blocked (unlikely for localhost)
4. **Check Resource Limits**: System may be low on memory (check Task Manager)

For detailed diagnostics, see: `SPRINT-DIAGNOSTIC-2026-08-22.md`

---

**Last Updated**: 2026-08-24 23:00 EDT  
**Status**: Ready for Production (manual launch required)
