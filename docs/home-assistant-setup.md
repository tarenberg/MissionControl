# Home Assistant Setup on Twisted

## Architecture
- **HA runs in**: WSL2 Ubuntu via systemd user service
- **Accessible at**: `http://localhost:8123`
- **Config location**: `C:\Users\tberg\.homeassistant\` (Windows) = `~/.homeassistant` (WSL2)
- **HA Version**: 2024.12.0
- **Python venv**: `/opt/homeassistant/venv`

## Auto-Start
HA is configured as a systemd user service and starts automatically when WSL2 boots.

### Manual start/stop/status (run in Ubuntu WSL2 terminal):
```bash
systemctl --user start homeassistant
systemctl --user stop homeassistant
systemctl --user status homeassistant
systemctl --user restart homeassistant
```

### View logs:
```bash
journalctl --user -u homeassistant -f
```

## On Windows Reboot
WSL2's IP address changes on each reboot. Run this script after reboot to refresh the portproxy:
```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\tberg\Documents\_PROJECTS\MissionControl\scripts\ha-startup.ps1"
```

Or add it to Task Scheduler (run at login, elevated).

## Getting Your API Token
1. Open http://localhost:8123
2. Log in (create account on first run)
3. Click your profile avatar (bottom-left)
4. Scroll to **Security → Long-Lived Access Tokens**
5. Click **Create Token** → name it "Mission Control" → copy it
6. Add to `.env.local`:
   ```
   HA_TOKEN=your_token_here
   ```
7. Restart the MC dev server

## Mission Control Integration
- Dashboard: `/home-control`
- API routes: `/api/home-control/states`, `/api/home-control/service`, `/api/home-control/status`
- Branch: `muffin/home-control`
