# Update Art Shows - Combined scraper and Gmail scanner
# Runs both web scraping and Gmail scanning

$MC_ROOT = "C:\Users\tberg\Documents\_PROJECTS\MissionControl"

Write-Host "🎨 Updating Art Show Deadlines..." -ForegroundColor Cyan

# Step 1: Scrape web sources
Write-Host "`n[1/2] Scraping web sources..." -ForegroundColor Yellow
Set-Location $MC_ROOT
node scripts/fetch-art-deadlines.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Web scraping failed" -ForegroundColor Red
}

# Step 2: Scan Gmail
Write-Host "`n[2/2] Scanning Gmail..." -ForegroundColor Yellow
python scripts/gmail-art-scanner.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Gmail scanning failed" -ForegroundColor Red
}

# Report results
$deadlinesFile = Join-Path $MC_ROOT "data\art-deadlines.json"
if (Test-Path $deadlinesFile) {
    $deadlines = Get-Content $deadlinesFile | ConvertFrom-Json
    $count = $deadlines.Count
    $sources = $deadlines | Group-Object source | Select-Object Name, Count
    
    Write-Host "`n✅ Total Deadlines: $count" -ForegroundColor Green
    Write-Host "📊 By Source:" -ForegroundColor Cyan
    $sources | ForEach-Object {
        Write-Host "   - $($_.Name): $($_.Count)" -ForegroundColor White
    }
    
    # Upcoming deadlines (next 7 days)
    $soon = $deadlines | Where-Object {
        $due = [DateTime]::Parse($_.due_date)
        $due -ge (Get-Date) -and $due -le (Get-Date).AddDays(7)
    }
    
    if ($soon.Count -gt 0) {
        Write-Host "`n⚠️ $($soon.Count) deadlines in next 7 days:" -ForegroundColor Yellow
        $soon | ForEach-Object {
            Write-Host "   - $($_.title) (due: $($_.due_date))" -ForegroundColor White
        }
    }
} else {
    Write-Host "❌ Deadlines file not found" -ForegroundColor Red
}

Write-Host "`n🎉 Art show update complete!" -ForegroundColor Green
