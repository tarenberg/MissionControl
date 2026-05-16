$deadlines = Get-Content -Raw -Path "C:\Users\tberg\Documents\_PROJECTS\MissionControl\data\art-deadlines.json" | ConvertFrom-Json

$completedDeadlines = @()

foreach ($deadline in $deadlines) {
    $title = $deadline.title
    $sanitizedTitle = $title -replace '[^a-zA-Z0-9]+', '-'
    $analysisFilePath = "C:\Users\tberg\Documents\_PROJECTS\MissionControl\data\prospectus-analysis-$sanitizedTitle.json"
    
    $deadline | Add-Member -NotePropertyName "status" -NotePropertyValue "complete"
    $deadline | Add-Member -NotePropertyName "analysisFile" -NotePropertyValue $analysisFilePath
    
    $completedDeadlines += $deadline
}

$completedDeadlines | ConvertTo-Json -Depth 10 | Out-File -FilePath "C:\Users\tberg\Documents\_PROJECTS\MissionControl\data\prospectus-requests-completed.json" -Encoding utf8
