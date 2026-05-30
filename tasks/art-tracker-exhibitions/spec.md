# Spec: Painting Exhibition and Show History Tracking

**Date:** 2026-05-30  
**Project:** MissionControl / ArtTrackerDashboard  
**Status:** Approved

---

## What We're Building

We are extending the Art Tracker in Mission Control to support tracking the exhibition and show entries for each painting directly on its details card. This turns the dashboard into a professional artist archive where Tom can monitor submission statuses (Pending, Accepted, Rejected), awards won, exhibition locations, dates, and fees for every painting.

---

## Requirements

### Must Have
- [ ] **Tabbed Details Card UI**: Re-architect the single-form Edit Artwork modal into a tabbed interface:
  - **Tab 1 (Details)**: Traditional editing form for Title, Medium, Dimensions, Price, Image, Status, and Location/Description.
  - **Tab 2 (Exhibition History)**: Chronological timeline of all shows this artwork has been submitted to.
- [ ] **Outcome & Award Fields**:
  - Track submission outcome: `Pending`, `Accepted`, or `Rejected` for each show entry.
  - Track awards: A custom text field (e.g., "Best in Show", "First Place") for entries that won prizes.
- [ ] **Database Expansion**:
  - Add `award` (VARCHAR(255)) column to the `deadline_submissions` table in MySQL (`looselyt_artwork`).
  - Ensure the `deadline_submissions` table is queried and returned as part of the artwork details payload.
- [ ] **Inline Show Editing**: Allow Tom to change submission outcomes and input awards directly from the painting details card without leaving the tab.
- [ ] **Sync Safety**: All adjustments must preserve full backward compatibility with the existing artwork database and must NOT affect the public website sync pipeline (`sync_website_art.py`).

### Nice to Have
- [ ] **Financial Cost Linkage**: If a submission fee is logged on a show, automatically register it as an expense or reference it on the painting details.
- [ ] **Logistics Visualizer**: Display delivery dates and retrieval/pickup deadlines clearly on the timeline so Tom never misses a gallery deadline.
- [ ] **Auto Status Sync**: When a painting is marked `Accepted` for an active show, offer to automatically set its primary status to `Committed` or `Exhibited`.

---

## Constraints

- **Tech Stack**: Next.js (TypeScript) client side, PHP backend, MySQL (`looselyt_artwork`) database.
- **Database Mod**: Adding columns to `deadline_submissions` in MySQL must be clean and safe (using PDO-compatible standard operations).
- **No Build Breakage**: Next.js typescript compilation must remain at 0 errors after UI modifications.

---

## Acceptance Criteria

- [ ] Artworks detail card displays two tabs: "Details" and "Exhibition History".
- [ ] Under "Exhibition History", any past or present show submissions for that artwork are listed chronologically.
- [ ] Users can edit the submission outcome (`Pending`, `Accepted`, `Rejected`) and type an award directly inside the painting details tab.
- [ ] Edits to submission outcome and awards successfully persist in the MySQL database via the PHP API.
- [ ] Next.js dev server builds successfully with no compilation errors.

---

## Open Questions & Decisions

1. **Exhibitions vs. Deadlines Terminology**: Show only shows on the painting's timeline where the painting is actually linked as **"Entered"**, **"Accepted"**, or **"Rejected"**.
2. **Multiple Entries**: Yes, a painting can be entered into multiple different exhibitions over its lifetime; display chronologically.
3. **Database Migration**: Yes, agent will run SQL commands directly to add the `award` column.
4. **Expense Integration**: Keep manual/separate (No auto-expense generation from show entries to prevent duplicate expense logs).
5. **Auto-Status Behavior**: Yes, prompt first before changing the artwork's main status when marking a painting as accepted.

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-05-30 | Draft Spec Created | Initial draft outlining requirements and open questions. |
| 2026-05-30 | Spec Approved | Tom approved the requirements and clarified all open questions (1. yes, 2. yes, 3. yes, 4. no, 5. yes). |
