# Server Health Check Script
# Verifies Mission Control, NestJS Backend, and Journey Sync are responding

$mc_url = "http://localhost:3000"
$backend_url = "http://localhost:3002/api/entries"
$journey_sync_url = "http://localhost:3000/journey-sync"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Mission Control + Journey Sync Health Check" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check Mission Control
Write-Host "1. Mission Control Frontend (port 3000)..." -NoNewline
try {
    $resp = Invoke-WebRequest -Uri $mc_url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host " ✅ Online" -ForegroundColor Green
    Write-Host "   Status: $($resp.StatusCode) OK"
} catch {
    Write-Host " ❌ Offline" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
}

# Check NestJS Backend
Write-Host ""
Write-Host "2. NestJS Backend API (port 3002)..." -NoNewline
try {
    $resp = Invoke-WebRequest -Uri $backend_url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    $data = $resp.Content | ConvertFrom-Json
    Write-Host " ✅ Online" -ForegroundColor Green
    Write-Host "   Status: $($resp.StatusCode) OK"
    Write-Host "   Database: $($data.total) journal entries found"
    if ($data.success -eq $false) {
        Write-Host "   ⚠️  API returned error: $($data.error.substring(0, 50))..." -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ Offline" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
}

# Check Journey Sync Page
Write-Host ""
Write-Host "3. Journey Sync Page..." -NoNewline
try {
    $resp = Invoke-WebRequest -Uri $journey_sync_url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host " ✅ Online" -ForegroundColor Green
    Write-Host "   Status: $($resp.StatusCode) OK"
} catch {
    Write-Host " ❌ Offline" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
}

# Check PostgreSQL
Write-Host ""
Write-Host "4. PostgreSQL Database..." -NoNewline
try {
    $container_check = docker ps | Select-String "postgres-mission-control"
    if ($container_check) {
        Write-Host " ✅ Running" -ForegroundColor Green
        Write-Host "   Container: postgres-mission-control (port 5432)"
    } else {
        Write-Host " ❌ Not running" -ForegroundColor Red
        Write-Host "   Hint: Run 'docker start postgres-mission-control'"
    }
} catch {
    Write-Host " ❌ Docker not available" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  • Mission Control:  $mc_url" -ForegroundColor White
Write-Host "  • Journey Sync:     $journey_sync_url" -ForegroundColor White
Write-Host "  • NestJS API:       $backend_url" -ForegroundColor White
Write-Host ""
Write-Host "To start servers, run:" -ForegroundColor Yellow
Write-Host "  C:\Users\tberg\Documents\_PROJECTS\START-DEV-SERVERS.bat" -ForegroundColor White
Write-Host ""
