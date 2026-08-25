# Mission Control Dev Server Watchdog
# Auto-restarts dev server if killed, logs uptime

param(
    [int]$RestartDelaySeconds = 2
)

$logFile = ".\dev-server-watchdog.log"
$projectDir = "C:\Users\tberg\Documents\_PROJECTS\MissionControl"

function Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp | $Message" | Tee-Object -FilePath $logFile -Append
}

Log "🧁 Dev Server Watchdog Started"
Log "Project: $projectDir"

$restartCount = 0

while ($true) {
    $restartCount++
    Log "▶️  Starting dev server (attempt #$restartCount)"
    
    $startTime = Get-Date
    
    # Run dev server
    & npm run dev
    
    $uptime = (Get-Date) - $startTime
    Log "⏹️  Dev server stopped after $($uptime.TotalSeconds) seconds"
    
    Log "⏳ Waiting ${RestartDelaySeconds}s before restart..."
    Start-Sleep -Seconds $RestartDelaySeconds
}
