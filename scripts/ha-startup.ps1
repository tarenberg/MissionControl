# ha-startup.ps1
# Run on Windows startup (via Task Scheduler) to:
# 1. Ensure WSL2 Ubuntu is running
# 2. Start Home Assistant via systemd if not already running
# 3. Refresh the portproxy with the current WSL2 IP

param([switch]$Force)

Write-Host "=== Home Assistant Startup ==="

# 1. Wake WSL2
Write-Host "[1/3] Waking WSL2 Ubuntu..."
wsl -d Ubuntu -e bash -c "echo 'WSL2 ready'" | Out-Null

# 2. Get WSL2 IP
$wslIp = (wsl -d Ubuntu -e bash -c "hostname -I" 2>&1).Trim().Split(" ")[0]
Write-Host "WSL2 IP: $wslIp"

# 3. Start HA via systemd if not running
$haStatus = wsl -d Ubuntu -e bash -c "systemctl --user is-active homeassistant" 2>&1
if ($haStatus -ne "active" -or $Force) {
    Write-Host "[2/3] Starting Home Assistant service..."
    wsl -d Ubuntu -e bash -c "systemctl --user start homeassistant"
    Start-Sleep 5
} else {
    Write-Host "[2/3] Home Assistant already active."
}

# 4. Refresh portproxy with current WSL2 IP
Write-Host "[3/3] Refreshing portproxy ($wslIp -> 8123)..."
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8123 2>&1 | Out-Null
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8123 connectaddress=$wslIp connectport=8123 2>&1 | Out-Null

# 5. Verify
Start-Sleep 3
try {
    $r = Invoke-WebRequest -Uri "http://localhost:8123" -TimeoutSec 10 -UseBasicParsing
    Write-Host "✅ Home Assistant is accessible at http://localhost:8123 (HTTP $($r.StatusCode))"
} catch {
    Write-Host "⚠️  HA not yet responding - may still be booting. Try again in 30s."
}
