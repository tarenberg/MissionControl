# Tasks: Painting Exhibition and Show History Tracking

**Date:** 2026-05-30  
**Plan:** [plan.md](./plan.md)

> Each task must be atomic — small enough to implement and test in isolation.

---

## Tasks

### Phase 1: Database Schema Expansion
- [x] **Task 1**: Run SQL migration to add `award` column to table `deadline_submissions` in MySQL `looselyt_artwork` database — *Database Command*
- [x] **Task 2**: Verify the column was successfully added and is nullable — *Database Verification*

### Phase 2: API Modifications (PHP)
- [x] **Task 3**: Update `C:\Users\tberg\Documents\_PROJECTS\ArtTrackerDashboard\api\artworks.php` GET handler to fetch and group exhibition histories for each painting — `artworks.php`
- [x] **Task 4**: Update `C:\Users\tberg\Documents\_PROJECTS\ArtTrackerDashboard\api\deadlines.php` POST handler to support the new `update_submission` action to persist status and award changes — `deadlines.php`
- [x] **Task 5**: Verify endpoints via local cURL calls or test scripts — *Verification*

### Phase 3: Frontend Model & Styling (React)
- [x] **Task 6**: Update `Artwork` typescript interface in `ArtTrackerDashboard.tsx` to include `exhibitions` array property — `ArtTrackerDashboard.tsx`
- [x] **Task 7**: Add neomorphic CSS styles for tabs, active indicators, and timeline entries — `ArtTrackerDashboard.module.css`

### Phase 4: Tabbed UI & History Render (React)
- [x] **Task 8**: Re-architect the edit modal in `ArtTrackerDashboard.tsx` to support a state-driven tabbed display (Info vs. Exhibition History) — `ArtTrackerDashboard.tsx`
- [x] **Task 9**: Build the "Exhibition History" tab containing the list of past entries with status pills and editable award text inputs — `ArtTrackerDashboard.tsx`
- [x] **Task 10**: Wire up the API save handlers so changing submission status or awards updates the database on-change or on-blur — `ArtTrackerDashboard.tsx`
- [x] **Task 11**: Add the status sync confirmation prompt so marking a painting as accepted pops up a modal to update its primary tracker status — `ArtTrackerDashboard.tsx`

### Phase 5: Verification & Review
- [x] **Task 12**: Run TypeScript verification compilation (`npx tsc --noEmit` in MissionControl) to verify 0 errors — *Verification*
- [x] **Task 13**: Commit changes on a clean branch `muffin/art-tracker-exhibition-history` and open a Pull Request — *Git Operations*

---

## Done Criteria

All tasks checked. Spec acceptance criteria verified. `spec.md` decisions log up to date.
