# Nightly Log

## 2026-05-13 - Social Celebration Engine & Pathfinder Scrape
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **Implemented Social Celebration Engine (Task-6)**: 
    - Built a backend compositing engine using `sharp` and Gemini Flash to generate social media graphics for show acceptances.
    - Added a **"Celebrate"** button to the Art Tracker dashboard for artworks with "Accepted" status.
    - Created a **Celebration Preview Modal** with AI-crafted captions and download/copy actions.
    - Implemented a secure `/api/media` route to serve generated assets.
- **Pathfinder Trend Radar**:
    - Scraped 80+ new art opportunities.
    - Identified "Elemental Dynamics" (Water/Light) as the dominant curator trend for 2026.
    - Flagged the **Providence Art Club National Open** and **The Hopper Prize** as high-value targets for Tom.
- **Infrastructure**:
    - Decoupled art deadline storage into `data/art-deadlines.json`.
    - Hardened the `fetch-art-deadlines.js` scraper with Jina bypass for Cloudflare-protected sites.

### Lessons Learned:
- Using Gemini Flash for caption generation is significantly faster and cheaper than Pro for short-form social copy.
- Compositing SVG over images with `sharp` is a lightweight way to generate brand-consistent celebration assets without a heavy canvas dependency.

### Next Steps:
- Automate the cleanup of the `media/celebrations` folder (retention policy).
- Integrate the Trend Radar into the main Dashboard view as a "Discovery Digest."
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **Enhanced Submission Assistant Timeline**: Updated the AI extraction pipeline and UI to handle a full logistics timeline, including Shipping, Receipt, Show Dates, and Return/Pickup dates.
- **Improved Data Integrity**: Fixed a manual data entry bottleneck for the Providence Art Club National Open Juried Exhibition (corrected fee).
- **UI Polish & Stability**:
    - Resolved "flashing" bugs in the Submission Assistant modal by optimizing React component rendering and animation triggers.
    - Implemented a status-based filter for the Artworks gallery to streamline selection.
    - Compacted the dashboard layout (reduced padding/gaps) to improve vertical information density.
- **Linked Artworks UI**: Integrated a two-column layout in the submission modal with a persistent side-panel for managing linked artworks and thumbnails.
- **Broken Link Remediation**: Verified and hardened path normalization for artwork thumbnails and prospectus resources.

### Lessons Learned:
- Avoid excessive `animate-in` classes on internal modal components that update frequently via polling; it causes visual "flashing" as components remount.
- Standardizing database fields for logistics (ship_date, return_date) early in the AI extraction logic simplifies the frontend mapping.

### Next Steps:
- Address 403 Forbidden errors for `artistsnetwork.com` by migrating to Jina bypass for all agent-based research.
- Monitor AI cost syncing logic for potential Gmail API token expiration.
- Finalize the Daily Trend Digest for the Pathfinder initiative.

## 2026-05-14 - Discovery Digest & Retention Policy
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **Discovery Digest Integration**:
    - Created `/api/discovery-digest` to parse the `Pathfinder-Trend-Radar.md` and serve it as structured JSON.
    - Updated the **Art Tracker Dashboard** to include a "Pathfinder Trend Radar" card in the Discovery panel, surfacing priority targets (like Hamden Art League) and market trends (like "The New Noir") directly in the UI.
- **Media Retention Policy**:
    - Implemented `scripts/cleanup-celebrations.js` to automatically purge celebration assets older than 30 days.
    - Verified logic with a trial run (0 files deleted, as assets are fresh).
- **Dashboard Optimization**:
    - Reduced manual navigation by bringing the Scout's trend research into the primary workspace.

### Lessons Learned:
- Decoupling markdown-based research into a JSON-serving API allows for easy UI integration while maintaining human-readable research logs.

### Next Steps:
- Address 403 Forbidden errors for `artistsnetwork.com` using Jina bypass.
- Build the "Daily Scout" cron job to trigger the scavenger and trend analyzer automatically.

## 2026-05-15 - Discovery Sync & Tracking Patch
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **Track Opportunity Sync**:
    - Patched `ArtTrackerDashboard.tsx` to resolve a workflow gap: "Track Opportunity" now performs a **double-write** to both the tracking database (`upcoming_shows`) and the primary deadline calendar (`deadlines`).
    - This ensures tracked opportunities immediately appear on the Calendar and the top-level Deadline spreadsheet.
- **UI & Encoding Hardening**:
    - Resolved persistent character encoding issues in `ArtTrackerDashboard.tsx` by migrating all raw emojis and icons to explicit **Unicode escape sequences** (`\uXXXX`). This prevents PowerShell/Get-Content from mangling characters into `dY?` or `o-`.
    - Fixed the "View Details" logic for artworks to default to the Edit interface when no deadline is selected.
    - Standardized active item highlighting in CSS modules for both `deadlineItem` and `showItem`.
- **Scraper Hardening**:
    - Migrated all remaining scrapers in `fetch-art-deadlines.js` to use the **Jina AI bypass** (`r.jina.ai`), successfully resolving 403 Forbidden blocks on `Artists Network` and `ArtShow`.
    - Automated the prospecting worker (`worker-prospectus.js`) to ensure it restarts autonomously.
- **Pathfinder Trend Digest (May 15)**:
    - Generated the daily Scout digest for 71 deadlines.
    - Highlighted **"Elemental Dynamics" (Water)** and **"New Noir"** as trending themes.
    - Identified **Art of the Northeast (Silvermine, CT)** as the high-priority local target.
- **Investment Research**:
    - Produced a detailed research brief for **Atoco** (AWH and Carbon Capture tech by Prof. Omar Yaghi) in `docs/research/atoco-investment-brief.md`.
- **Celebration Engine Hardening**:
    - Refactored `scripts/generate-acceptance-post.js` to use **dynamic SVG scaling**, ensuring social media banners match the source artwork's dimensions perfectly.

### Lessons Learned:
- Manual database state (like status "Entered") can cause items to be hidden from tracking views if the UI filters are too aggressive; proactive "Interested" resets are needed during discovery tracking.

### Next Steps:
- Automate the "Daily Scout" scavenge via cron.
## 2026-05-15 (Nightly Sprint)
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **Show Opportunity Filtering**: Hardened the "Shows & Calls" pipeline. It now strictly filters out shows you've already committed to or entered, ensuring you only see new opportunities.
- **Submission Assistant UI**: 
    - Overhauled the header to prioritize **Show Titles** for better context.
    - Optimized modal heights and added scroll support to prevent UI clipping on smaller screens.
    - Reinforced save logic to include missing fields (Title/Status) for more reliable database syncing.
- **Artwork Archive**: Launched a new **Hi-Res vault** at `docs/artwork-archive/` with subfolders for `master-scans` and `HiRes`. This provides a central, high-fidelity storage area for 5K master images.
- **Precision Imaging Engine**: 
    - Developed a custom Python geometric transformation script (`deskew_painting.py`) that uses quad-to-rectangle projection to flatten painting photos.
    - Successfully resolved "stretching" issues by forcing physical aspect ratios (24x16 for "Uptown").
    - Achieved a **True 5K (5000px+)** output optimized to stay just under the 5MB target size.

### Lessons Learned:
- Generic AI-based "straightening" tools often ignore physical aspect ratios; a custom math-based transform is needed to prevent stretching.
- Large Hi-Res images need their own archival space in the workspace to avoid bloating the dashboard's fast-loading thumbnail system.

### Next Steps:
- **Studio Scan Tool (High-Value Feature)**:
    - Built a precision geometric transformation engine (`scripts/scan_engine.py`) using OpenCV and Pillow.
    - Integrated a **"Studio Scan"** tool into the Art Tracker Dashboard.
    - Features a real-time **Quad-Transform UI** where you can drag corner pins over your photo to define the straightened area.
    - Automatically forces physical aspect ratios (e.g., 1.5 for 24x16) to prevent image stretching.
    - Generates **True 5K (5000px+)** masters and archives them automatically in `docs/artwork-archive/`.
- **ROI Audit**: Complete the manual re-entry of sale prices for artworks 1, 4, and 57 using the new hybrid format.
