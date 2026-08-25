# Mission Control Standalone Startup

## Problem
Dev server is killed by SIGKILL when run through OpenClaw exec. Running outside OpenClaw avoids the issue.

## Solution: Native PowerShell Watchdog

### Step 1: Open PowerShell (NOT through OpenClaw)
```powershell
# Press Win+X, select "Windows PowerShell (Admin)"
# OR: Right-click desktop → "Open in Terminal"
```

### Step 2: Run watchdog
```powershell
cd C:\Users\tberg\Documents\_PROJECTS\MissionControl
powershell -ExecutionPolicy Bypass -File .\dev-server-watchdog.ps1
```

### Step 3: Monitor
- Watchdog logs to `dev-server-watchdog.log`
- Dev server available at `http://localhost:3000`
- Watchdog auto-restarts dev server if killed

## Expected Behavior
```
2026-08-23 13:30:57 | 🧁 Dev Server Watchdog Started
2026-08-23 13:30:57 | ▶️  Starting dev server (attempt #1)
> ***@0.1.0 dev
> next dev --hostname 0.0.0.0
✓ Ready in 443ms
 GET /journal 200
 GET /api/journal?lite=1 200
```

## Troubleshooting

### Dev server still killed?
1. Check Windows Defender real-time protection (Settings → Security)
2. Add `node.exe` to Defender exclusions
3. Check AppLocker policies (`secpol.msc` → Application Control Policies)

### Port 3000 in use?
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
taskkill /PID <pid> /F
```

### Want to stop watchdog?
Press `Ctrl+C` in PowerShell

## Services Status
- PostgreSQL: `docker ps | grep postgres` (should be running)
- Journey Sync: `docker ps | grep journey` (should be running)
- Mission Control: http://localhost:3000

## Files
- Watchdog script: `dev-server-watchdog.ps1`
- Watchdog logs: `dev-server-watchdog.log`
- Env config: `.env.local` (PostgreSQL connection)
