# Backup Journey Sync entries to Google Drive
# Scheduled: Nightly cron task
# Location: G:\My Drive\Chronicles

$BackendUrl = if ($env:JOURNEY_SYNC_URL) { $env:JOURNEY_SYNC_URL } else { "http://localhost:3002" }
$BackupDir = "G:\My Drive\Chronicles"
$Timestamp = Get-Date -Format "yyyy-MM-dd"
$BackupFile = Join-Path $BackupDir "journey-sync-backup-$Timestamp.json"

Write-Host "[Journey Sync Backup] Starting backup to $BackupDir"

# Verify backup directory exists
if (-not (Test-Path $BackupDir)) {
    Write-Error "Backup directory not found: $BackupDir"
    exit 1
}

try {
    # Fetch all entries from backend
    Write-Host "Fetching entries from backend..."
    $uri = "$BackendUrl/api/entries?skip=0&take=10000"
    $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
    $entries = ($response.Content | ConvertFrom-Json).entries

    # Create backup object
    $backup = @{
        version = "1.0"
        exportedAt = (Get-Date).ToUniversalTime().ToString("o")
        totalEntries = $entries.Count
        entries = $entries
    }

    # Write backup file
    Write-Host "Writing backup to $BackupFile..."
    $backup | ConvertTo-Json -Depth 10 | Out-File -FilePath $BackupFile -Encoding UTF8 -Force

    # Cleanup old backups (keep last 30 days)
    Write-Host "Cleaning up old backups..."
    $cutoffDate = (Get-Date).AddDays(-30)
    Get-ChildItem -Path $BackupDir -Filter "journey-sync-backup-*.json" | Where-Object {
        $_.LastWriteTime -lt $cutoffDate
    } | ForEach-Object {
        Write-Host "Deleting old backup: $($_.Name)"
        Remove-Item -Path $_.FullName -Force
    }

    Write-Host "OK Backup successful: $($backup.totalEntries) entries"
    Write-Host "File: $BackupFile"
    exit 0
} catch {
    Write-Error "ERROR Backup failed: $($_.Exception.Message)"
    exit 1
}
