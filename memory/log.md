# Docs Log

This is an append-only chronological record of studio operations, knowledge ingestion, and significant system changes.

## [2026-05-03 14:38] ✨ UI Polish: Interactive Card Glows
- **Animation Style**: Created a new `.interactive-card` global class in `globals.css` that implements a soft blue focus glow.
- **Visual Feedback**: Applied this class to all Project and Task cards. When hovered or focused, cards now "lift" slightly and emit a smooth blue bloom (`rgba(59,130,246,0.3)`), making the interface feel more reactive and depth-aware.

## [2026-05-03 11:15] 🌙 Nightly Sprint: Docs Hub & Studio Bridge
- **Docs Hub 2.0**: 
    - Expanded entry points to include `Tasks`, `Scripts`, `Skills`, and `Source Code`.
    - Integrated local source browsing via `projects_bridge` junction.
    - Added color-coded icons and neomorphic UI refinements to `DocsBrowser.tsx`.
- **Studio Bridge (Google Home)**:
    - Initialized the `StudioBridge` project.
    - Implemented `lib/nest.ts` for Google Nest SDM API integration.
    - Created `/api/studio/environment` route for thermostat monitoring.
    - **Decision**: Deferred Pub/Sub Events setup to keep initial implementation lean. Added to future backlog.
- **UI Improvements**:
    - Added column sorting (Title, Status) to the Tasks page.
    - Implemented deep-linking in `DocsBrowser` to allow direct file access via URL.

---
- **Ingest**: Processed the "LLM Docs" concept document.
- **Architecture**: Established the Three-Layer Architecture (Raw -> Docs -> Schema).
- **Renaming**: Renamed "Studio Wiki" to "Docs" and removed the experimental "Research Ingest" tool across Mission Control and the OpenClaw workspace.
- **Tooling**: Created initial `index.md` and `log.md` to shift from RAG to a compounding knowledge base.
- **PictureHangerPro Fixed**: 
    - Fixed missing `node_modules` by running `npm install`.
    - Resolved the "Vite not found" error.
    - Successfully spun up the dev server on port 3005.
- **Mission Control Fixes**:
    - Resolved Windows Junction "Error loading content" bug in Docs.
    - Cleared port 3000 conflicts and optimized Next.js dev server startup.
    - Added "Abandoned" status to project management schema and UI.
- **Path Normalization**: Added `decodeURIComponent` support for filenames with spaces (e.g., Artist Statements).

---
*Log started by Muffin 🧁*
