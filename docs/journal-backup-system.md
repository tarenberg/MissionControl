# Journal Backup System

**Purpose:** Prevent data loss by automatically saving journal entries to disk.

## How It Works

Every journal operation triggers a file-system backup:

1. **Create Entry** → `YYYY-MM-DDTHH-mm-ss_<entryId>.json`
2. **Edit Entry** → New timestamped backup with updated content
3. **Delete Entry** → `YYYY-MM-DDTHH-mm-ss_DELETED_<entryId>.json` (tombstone)

All backups are stored in: `C:\Users\tberg\Documents\_PROJECTS\MissionControl\backups\journal\`

## Recovery

### List All Backups
```bash
curl http://localhost:3000/api/journal/backup
```

### Load Specific Backup
```bash
curl http://localhost:3000/api/journal/backup?file=SNAPSHOT_2026-06-11T22-05-51.json
```

### Create Full Snapshot (Manual Backup)
```bash
curl http://localhost:3000/api/journal/backup?snapshot=1
```

**Response:**
```json
{
  "success": true,
  "snapshot": "SNAPSHOT_2026-06-11T22-05-51.json",
  "count": 2
}
```

## Version Control

- **Backups are NOT committed to git** (`.gitignore` is configured)
- **Manual git backup recommended**: Periodically commit `backups/journal/SNAPSHOT_*.json` files to a private repo or cloud storage

## Disaster Recovery

If database is lost or corrupted:

1. **Find latest snapshot:**
   ```bash
   ls -lt backups/journal/SNAPSHOT_*.json | head -1
   ```

2. **Load backup data** (manual import into Prisma DB)
3. **Or restore from individual entry files** sorted by timestamp

## Protection Against

- ✅ IndexedDB cache clearing
- ✅ Database corruption
- ✅ Accidental deletions
- ✅ Dev environment resets
- ✅ Browser storage limits

## Limitations

- **Manual recovery required** (no one-click restore yet)
- **Media files backed up via DB reference only** (physical files in `public/uploads/` are not auto-backed up)

---

**Created:** 2026-06-11  
**Last Updated:** 2026-06-11
