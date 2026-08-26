# Mission Control Windows Service Installer
# Installs MissionControl + Journey Sync as a Windows Service with auto-restart
# Run as Administrator

param(
    [ValidateSet("install", "uninstall", "start", "stop", "status")]
    [string]$Action = "status"
)

$ServiceName = "MissionControlService"
$DisplayName = "Mission Control + Journey Sync"
$Description = "Auto-managed service for Mission Control frontend and NestJS backend"
$BinaryPath = "C:\Users\tberg\Documents\_PROJECTS\mission-control-service.exe"
$ConfigPath = "C:\Users\tberg\Documents\_PROJECTS\mission-control-service.config"

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "ERROR: This script must run as Administrator" -ForegroundColor Red
    exit 1
}

function Install-Service {
    Write-Host "Installing $DisplayName service..."
    
    # Create config file
    @"
{
  "serviceName": "$ServiceName",
  "displayName": "$DisplayName",
  "description": "$Description",
  "missionControl": {
    "path": "C:\Users\tberg\Documents\_PROJECTS\MissionControl",
    "command": "npm run dev -- -p 3000",
    "port": 3000,
    "env": {
      "NODE_ENV": "development"
    }
  },
  "nestjsBackend": {
    "path": "C:\Users\tberg\Documents\_PROJECTS\mission-control-backend",
    "command": "npm run start",
    "port": 3002,
    "env": {
      "DATABASE_URL": "postgresql://postgres:tbergpass123@localhost:5432/mission_control",
      "NODE_ENV": "development"
    }
  },
  "logging": {
    "directory": "C:\Users\tberg\Documents\_PROJECTS\logs",
    "maxSizeKb": 10240,
    "retainDays": 7
  },
  "autoRestart": {
    "enabled": true,
    "delaySeconds": 5,
    "maxAttemptsPerHour": 10
  }
}
"@ | Out-File -FilePath $ConfigPath -Encoding UTF8 -Force
    
    Write-Host "✅ Config file created at: $ConfigPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Download NSSM (Non-Sucking Service Manager) from: https://nssm.cc/download"
    Write-Host "2. Extract nssm.exe to: C:\Users\tberg\Documents\_PROJECTS\"
    Write-Host "3. Run as Administrator:"
    Write-Host "   C:\Users\tberg\Documents\_PROJECTS\nssm.exe install $ServiceName C:\Users\tberg\Documents\_PROJECTS\start-both-servers.ps1"
    Write-Host ""
    Write-Host "Then enable the service:"
    Write-Host "   net start $ServiceName"
}

function Uninstall-Service {
    Write-Host "Uninstalling $DisplayName service..."
    
    $service = Get-Service $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        Stop-Service $ServiceName -ErrorAction SilentlyContinue
        sc.exe delete $ServiceName | Out-Null
        Write-Host "✅ Service removed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Service not found" -ForegroundColor Yellow
    }
}

function Start-MissionControlService {
    Write-Host "Starting $DisplayName service..."
    Start-Service $ServiceName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Get-Service $ServiceName | Select-Object Name, Status
}

function Stop-MissionControlService {
    Write-Host "Stopping $DisplayName service..."
    Stop-Service $ServiceName -ErrorAction SilentlyContinue
    Write-Host "✅ Service stopped" -ForegroundColor Green
}

function Get-ServiceStatus {
    $service = Get-Service $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "Service Status:" -ForegroundColor Cyan
        $service | Select-Object Name, DisplayName, Status, StartType
        Write-Host ""
        Write-Host "Checking ports:" -ForegroundColor Cyan
        Get-NetTCPConnection -LocalPort 3000, 3002 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort, State
    } else {
        Write-Host "Service not installed" -ForegroundColor Yellow
    }
}

# Route to appropriate function
switch ($Action) {
    "install" { Install-Service }
    "uninstall" { Uninstall-Service }
    "start" { Start-MissionControlService }
    "stop" { Stop-MissionControlService }
    "status" { Get-ServiceStatus }
    default { Write-Host "Unknown action: $Action"; exit 1 }
}
