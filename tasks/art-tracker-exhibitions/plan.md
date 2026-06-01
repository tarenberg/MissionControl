# Plan: Painting Exhibition and Show History Tracking

**Date:** 2026-05-30  
**Status:** Draft  
**Spec:** [spec.md](./spec.md)

> Agent is READ-ONLY during this phase. No implementation files may be touched until Tom approves this plan.

---

## Approach

Our approach leverages the existing MySQL table structure in the `looselyt_artwork` database. We will perform a minor, safe schema upgrade to track awards, update the PHP API files to handle and return the exhibition history for each painting, and redesign the front-end edit modal in `ArtTrackerDashboard.tsx` to feature a beautiful, neomorphic tabbed design.

1.  **Database Upgrade**: Add the `award` column directly to the `deadline_submissions` table.
2.  **API Integration**:
    *   Update `artworks.php` GET payload to query and attach an array of `exhibitions` (from `deadline_submissions` joined with `deadlines`) to each artwork.
    *   Update `deadlines.php` POST payload with a new action `update_submission` to allow saving custom status (Pending/Accepted/Rejected) and award text for a given artwork-show connection.
3.  **UI Redesign**:
    *   Introduce tabs in the main edit modal in `ArtTrackerDashboard.tsx`: "Details" and "Show History".
    *   On "Show History", render a list of entries from the painting's exhibitions array with clean status pill selectors and award input fields.
    *   Provide inline editing so changing the status or typing an award automatically saves via the API.
    *   On marking "Accepted", trigger a confirmation to ask if Tom wants to update the main painting status.

---

## Target Files

| File | Change Type | Notes |
|------|------------|-------|
| **Database** (`looselyt_artwork`) | Alter Schema | Add `award VARCHAR(255) DEFAULT NULL` to table `deadline_submissions`. |
| `ArtTrackerDashboard/api/artworks.php` | Modify | Update GET query to fetch each painting's submission history and join it with the respective deadline info. |
| `ArtTrackerDashboard/api/deadlines.php` | Modify | Add a new action `update_submission` in POST handler to allow setting `status` and `award`. |
| `MissionControl/components/ArtTrackerDashboard.tsx` | Modify | Redesign modal to support tabbed rendering, show timeline lists, inline status dropdown, award text inputs, and API updates. |
| `MissionControl/components/ArtTrackerDashboard.module.css` | Modify | Add neomorphic styling for tabs, active indicators, and timeline bullet items. |

---

## Pseudocode / Logic Sketch

### PHP API Update (`artworks.php` GET):
```php
// In artworks.php GET handler
$subStmt = $conn->prepare("
    SELECT ds.artwork_id, ds.deadline_id, ds.status as submission_status, ds.award, 
           d.title as show_title, d.location, d.date as due_date, d.show_start, d.show_end, d.return_date, d.fee
    FROM deadline_submissions ds
    JOIN deadlines d ON ds.deadline_id = d.id
");
$subStmt->execute();
$submissions = $subStmt->fetchAll(PDO::FETCH_ASSOC);

// Map submissions list to mapping arrays grouped by artwork_id...
$subsByArt = [];
foreach ($submissions as $sub) {
    $artId = $sub['artwork_id'];
    $subsByArt[$artId][] = [
        'deadlineId' => (int)$sub['deadline_id'],
        'showTitle' => $sub['show_title'],
        'location' => $sub['location'],
        'dueDate' => $sub['due_date'],
        'showStart' => $sub['show_start'],
        'showEnd' => $sub['show_end'],
        'returnDate' => $sub['return_date'],
        'fee' => $sub['fee'],
        'status' => $sub['submission_status'],
        'award' => $sub['award']
    ];
}

// In the mappedArtworks loop, assign:
$mappedArtworks[] = [
    ...
    'exhibitions' => isset($subsByArt[$painting['id']]) ? $subsByArt[$painting['id']] : []
];
```

---

## Dependencies

- **MySQL Connection**: Requires active write capability to the MySQL container on localhost (verified operational).
- **TypeScript Interface Sync**: Update the `Artwork` and `Deadline` interfaces in `ArtTrackerDashboard.tsx` to include the new types without causing TypeScript build failures.

---

## Risks & Unknowns

- **HMR Desync**: Swapping between branch states could desynchronize client browser caches. We will run build and validation tests during testing to ensure clean compilation.
- **Null Safety**: Some entries might have empty dates (`return_date`, `show_start`, etc.). Our React frontend must use optional chaining and fallback strings.

---

## Alternatives Considered

| Option | Rejected Because |
|--------|-----------------|
| Separate `ShowEntry` relation model in Prisma | Requires setting up SQLite-MySQL cross-database sync, schema migrations on both, and rewriting the sync script. Leverages the existing PHP and MySQL `deadline_submissions` structure instead, which is simpler and highly compatible. |
