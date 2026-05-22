# Task: Build Art Scan Tool (Nightly Sprint)

## Phase 1: Backend API
- [x] Create a Python-based FastAPI or Flask route to expose the `deskew_painting.py` logic. (Implemented as `scan_engine.py` + `scan.php`)
- [x] Implement automatic corner detection using OpenCV `findContours` (as a fall-back to manual points).
- [x] Add the "Aspect Ratio" database lookup to the processing flow. (Added as `ratio` field in scan tool)

## Phase 2: Frontend Integration
- [x] Add a "Scan Artwork" button to the `ArtTrackerDashboard.tsx`.
- [x] Implement a modal for uploading the photo and (optionally) adjusting corner pins.
- [x] Show a preview of the "Flat" result before saving to the archive. (Added Corner Pin Overlay)

## Phase 3: Archival Automation
- [x] Automatically save to `docs/artwork-archive/` and update `inventory.md`.
- [x] Update the `paintings` table image URL if confirmed.
