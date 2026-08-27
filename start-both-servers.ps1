# Windows Service Launcher for Mission Control + Journey Sync
# This script runs as a Windows Service via NSSM
# It manages both servers with auto-restart on crash

$LogDir = "C:\Users\tberg\Documents\_PROJECTS\logs"
$LogFile = "$LogDir\service.log"
$MCPath = "C:\Users\tberg\Documents\_PROJECTS\MissionControl"
$BackendPath = "C:\Users\tberg\Documents\_PROJECTS\mission-control-backend"

# Create log directory
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp | $Message" | Add-Content -Path $LogFile
    Write-Host "[$timestamp] $Message"
}

function Check-Port {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

function Start-Server {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command,
        [int]$Port,
        [hashtable]$Env
    )
    
    Log "Starting $Name on port $Port..."
    
    try {
        Push-Location $Path
        
        # Set environment variables
        foreach ($key in $Env.Keys) {
            [Environment]::SetEnvironmentVariable($key, $Env[$key], "Process")
        }
        
        # Build command
        $scriptBlock = {
            param($cmd, $env)
            foreach ($key in $env.Keys) {
                [Environment]::SetEnvironmentVariable($key, $env[$key], "Process")
            }
            Invoke-Expression $cmd
        }
        
        # Start process
        $process = Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-NoProfile -Command `"$Command`"" `
            -WorkingDirectory $Path `
            -WindowStyle Hidden `
            -PassThru
        
        Log "[OK] $Name started (PID: $($process.Id))"
        Pop-Location
        return $process
    } catch {
        Log "[ERROR] Failed to start $Name : $_"
        Pop-Location
        return $null
    }
}

function Monitor-Servers {
    Log "================= SERVICE STARTED ================="
    Log "Mission Control: $MCPath (port 3000)"
    Log "NestJS Backend: $BackendPath (port 3002)"
    Log "=================================================="
    
    $mcProcess = $null
    $backendProcess = $null
    $mcEnv = @{"NODE_ENV" = "development"}
    $backendEnv = @{
        "DATABASE_URL" = "postgresql://postgres:tbergpass123@localhost:5432/mission_control"
        "NODE_ENV" = "development"
    }
    
    while ($true) {
        try {
            # Check Mission Control
            if ($null -eq $mcProcess -or $mcProcess.HasExited -or -not (Check-Port 3000)) {
                Log "Mission Control down - restarting..."
                if ($null -ne $mcProcess) { $mcProcess.Kill(); $mcProcess.Dispose() }
                $mcProcess = Start-Server "Mission Control" $MCPath "npm run dev -- -p 3000" 3000 $mcEnv
                Start-Sleep -Seconds 3
            }
            
            # Check NestJS Backend
            if ($null -eq $backendProcess -or $backendProcess.HasExited -or -not (Check-Port 3002)) {
                Log "NestJS Backend down - restarting..."
                if ($null -ne $backendProcess) { $backendProcess.Kill(); $backendProcess.Dispose() }
                $backendProcess = Start-Server "NestJS Backend" $BackendPath "npm run start" 3002 $backendEnv
                Start-Sleep -Seconds 3
            }
            
            # Check both servers are healthy
            if ((Check-Port 3000) -and (Check-Port 3002)) {
                Log "[OK] Both servers healthy"
            }
            
            Start-Sleep -Seconds 10
        } catch {
            Log "[ERROR] Monitoring error: $_"
            Start-Sleep -Seconds 5
        }
    }
}

# Run the monitor
try {
    Monitor-Servers
} catch {
    Log "[FATAL] $_"
    exit 1
}
