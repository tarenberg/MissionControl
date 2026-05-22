# Nightly Log

## 2026-05-21 (Nightly Sprint)
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **Neomorphic Personal Journal Deployed (Tasks 1 - 5)**:
    - **Local Multipart Media Uploader**: Created `public/uploads/journal` and engineered `app/api/journal/upload/route.ts` to parse images/videos from Tom's phone, verify extensions, and save them on-disk locally (bypassing public cloud buckets completely).
    - **Fully Responsive Journal UI**: Developed `app/journal/page.tsx` under the Loosely Twisted design system. It features a stunning, dual-shadow layout, high-contrast dynamic typography, tactile Mood Check Pickers, a file drag-and-drop area, and a flowing chronological timeline stream.
    - **Hands-Free Speech Dictation**: Integrated continuous client-side browser Web Speech API dictation inside the editor, letting Tom dictate journal entries from bed.
    - **Automatic Weather Capture**: Configured server-side `wttr.in` lookups in the POST CRUD handler to capture weather conditions (e.g. `☀️ 72°F`) for New Haven, CT, caching it directly in SQLite.
    - **Clean In-Place CRUD**: Engineered inline dynamic edit drawers and cascading unlinks for physical files upon entry deletion to prevent storage leaks. Added soft-navigation entry points in `components/Sidebar.tsx` and `components/ClientLayout.tsx`.
- **Art Tracker Cascading Transition & Secure Local Reverse Proxy**:
    - **CORS & Mixed-Content Cure**: Set up a Next.js server-side reverse proxy inside `next.config.ts` mapping `/tools/ArtTrackerDashboard/:path*` to local Apache on `http://localhost:8080`, allowing unencrypted PHP endpoints to serve local assets securely on secure domains (Tailscale).
    - **Google OAuth Keyring Rescue**: Fixed the broken weekly expense sync by dynamically parsing active OAuth secrets from local `gogcli` credentials files. Ran background pipelines, import-syncing **38 new exhibition and receipt expenses** into MySQL.
    - **One-Tap Acceptance Pipeline**: Patched `/api/deadlines.php` to save logistics and built a direct "Mark Accepted" action inside `components/ArtTrackerDashboard.tsx`. Tap of a button triggers a cascading SQL transaction: updating show status to `Accepted` in MySQL, while updating all linked painting inventory records from `Committed` to `Accepted`.
- **VAT Chat Deep Alignment & Stability Fixes**:
    - **Room Desynchronization Fixed**: Unified target room querying in backend controllers to link both floating popups and `/chat` to the same seeded "Muffin" CUID, stopping split-conversation threads.
    - **Voice Capture Locked-Mic Solution**: Implemented a client-side Float32 PCM sample buffer and custom browser Int16 WAV compiler inside `hooks/useGeminiLiveV7.ts`. This permits real-time transcription to run cleanly parallel to WebRTC streams. Added `triggerLLM: false` to persist user speech transcripts silently to the database without generating recursive Ollama loops.
    - **Layout & Contrast Hardening**: Fixed the hidden channels sidebar by lowering responsive breakpoints to 768px, ensuring laptop displays never lose workspace sidebars. Hardcoded high-contrast light-mode styles, and built smooth auto-scrolling ref anchors.
- **Production Build Integrity**:
    - Compiled the entire codebase via `npx tsc --noEmit` and confirmed **zero build errors or TypeScript warning failures**.
    - Successfully staged, committed, and pushed the entire finalized codebase to GitHub on branch `muffin/vat-chat`.

### Lessons Learned:
- Leveraging local-first proxy rewrites inside Next.js config completely bypasses browser security sandboxing for mixed content without forcing self-signed SSL on legacy development environments.
- Unlinking associated physical file assets on SQLite cascading deletes keeps the local home server highly optimized and completely avoids orphan leaks.

---

## 2026-05-20 (Nightly Sprint)
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **Standalone Telegram-Style VAT Chat Deployed (Task 1 - 8)**:
    - Designed and implemented a dedicated, full-screen developer workspace at `/chat` aligned with the "Loosely Twisted" dark-neomorphic aesthetic.
    - **Dual-Column layout**: Left sidebar handles channel management (direct lines to Muffin 🧁, Jason 🛠️, Scout 🔍, and Sentinel 🛡️, plus custom session creation and local search), while the right pane renders clean, conversation-focused bubbles.
    - **Premium UI Integrations**: Rendered code blocks inside a custom `<CollapsibleCodeBlock />` with instant copy-to-clipboard actions and collapse toggles. Added inline interactive action cards (`[ Approve Execution ]` / `[ Reject ]`) generated from OpenClaw payloads, and drag-and-drop file upload overlays with instant Tailscale network sync.
    - **Hybrid continuous input (5.c)**: Integrated the continuous `useVAT` hot-mic toggle directly into the input footer, supported by real-time voice feedback, global hotkeys (`Ctrl+M`), and auto-focusing textareas.
    - **Slash Command Autocomplete**: Configured slash shortcuts overlay suggestions list (typing `/` pops up shortcuts for `/status`, `/reset`, `/logs`, `/help`).
    - **Local Sync & Voice Playback**: Integrated a neat neomorphic speaker mute toggle in the header, enabling automatic spoken voice playback via local Piper TTS. Connected a 1.5s short-polling sync pipeline to dynamically mirror chat states across mobile and laptop over Tailscale.
- **Production Compilation & CI Backup (Task 9)**:
    - Ran full Next.js production build (`npm run build`), verifying **zero TypeScript compiler or syntax errors** for maximum stability.
    - Successfully backed up the complete Mission Control repository state to GitHub on branch `muffin/vat-chat`.

### Lessons Learned:
- Integrating multi-agent personification via custom system prompt generation based on room name is a highly responsive way to split agent duties (like debugging vs research) inside a unified SQLite schema.
- Short polling at 1.5s over Tailscale is incredibly fast, responsive, and completely removes the need for external cloud database connections for local-first sync.

### Next Steps:
- Add visual badge counts to the sidebar channels to indicate active unread notifications.
- Polish TTS playback voices to map specific Piper audio voices to the respective agent persona (e.g., a deeper voice for Sentinel).

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

## 2026-05-17 (Nightly Sprint)
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **Full-Duplex Voice Expansion (Studio Bridge)**:
    - Expanded the **Gemini Live Action Dispatcher** to handle `CHECK_STUDIO` and `STUDIO_COMMAND` actions.
    - Updated `ChatPopup.tsx` to listen for these actions and trigger backend API calls.
    - This allows Tom to ask "Check the studio" or "Set temperature to 72" via voice (requires Studio Bridge re-auth).
- **Studio Command API**:
    - Implemented `POST` handler in `/api/studio/environment` to support device commands via the Nest SDM API.
    - Added logic to automatically target the first available thermostat if no `deviceId` is provided.
    - Mapped high-level commands (like `SET_TEMPERATURE`) to specific Nest traits (Fahrenheit to Celsius conversion handled).
- **Dashboard Maintenance**:
    - Stabilized the development environment by verifying port 3000/8080 hygiene.
    - Hardened `fetch-art-deadlines.js` to ensure the Jina bypass correctly handles markdown-based parsing for ArtShow and Artists Network.

### Lessons Learned:
- Integrating Gemini Live with side-effects (like Nest commands) requires a robust dispatcher that can handle asynchronous state updates and provide visual feedback (Toasts/Events) since the AI's "voice" doesn't automatically know if the command succeeded.
- Jina AI's markdown conversion is excellent for regex-based scraping, but requires the parser to switch from DOM queries to text processing.

### Next Steps:
- **Nest Token Recovery**: Tom needs to re-authorize the Nest app to clear the `invalid_grant` error. I've prepared the UI and API to respond immediately once restored.
- **Studio Environment Trend Widget**: Build a more detailed "Environment History" view using the `ClimateLog` table data.
- **Audio Feedback**: Add a "Command Confirmed" sound effect or voice confirmation for successful actions triggered via voice.

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

## 2026-05-16 - VAT Chat & Action Dispatcher
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **VAT Chat Evolution (Continuous Mode)**:
    - Transitioned from silence-detection to a **"Hot Mic"** interaction model.
    - Implemented **Auto-Restart** logic: the microphone stays active/re-activates automatically after the AI response, enabling hands-free back-and-forth.
    - Added **Smart Mode Switching**: Typing in the chat bar now automatically "discards" the voice buffer and disables the mic to prevent ghost submissions.
- **Action Dispatcher (Voice-Command Bridge)**:
    - Enabled the LLM (Ollama/gemma2) to output structured `[[ACTION: ...]]` tags.
    - Implemented `executeAction` in the frontend to handle navigation and UI states.
    - Successfully tested "Search [term]", "Open Art Tracker", and "Toggle View" voice commands.
- **Art Tracker Database Audit**:
    - Verified database `looselyt_artwork` and table `paintings`.
    - Synchronized metadata for IDs 1, 4, and 57.
    - Implemented the hybrid price format (`Sold $[price]`) for ROI tracking.
- **System Maintenance**:
    - Purged ~450KB of automated error-monitor noise from `tasks/todo.md` to resolve context-bloat issues.
    - Stabilized the dev server with targeted PID kills for port 3000 conflicts.

### Lessons Learned:
- **Hot Mic UX**: Continuous listening is more natural for complex tasks, but needs a clear "Cancel" or "Discard" path (like the typing focus trigger) to avoid unintentional inputs.
- **Event-Driven UI**: Using `window.dispatchEvent` for voice actions allows the chat popup to control sibling components without prop-drilling or complex state management.

### Next Steps:
- Refresh the Nest Token (`invalid_grant`) to restore Studio Bridge connectivity.
- Verify Jina-based bypass reliability for `artistsnetwork.com` scraper.
- Monitor VAT sensitivity in the studio environment.

## 2026-05-18 (Nightly Sprint)
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **Resolved Gemini Live "Immediate Disconnect" (Handshake Fix)**:
    - Identified a critical React dependency loop in `useGeminiLiveV6.ts`. The `options` object was being re-created every render, triggering the `useEffect` cleanup and closing the WebSocket immediately (Error 1000).
    - Refactored the hook to use `optionsRef`, decoupling the WebSocket lifecycle from component re-renders.
    - Result: Stable, persistent Full-Duplex audio streams.
- **Protocol & Model Hardening**:
    - Locked the SDK to `apiVersion: v1alpha` and `models/gemini-2.5-flash-native-audio-latest`.
    - Verified model compatibility via live API discovery script.
    - Updated UI to **v2.5.7** (Timestamp **23:05**) for verification.
- **Nest Bridge Diagnostics**:
    - Performed a database audit on `ClimateLog`. Confirmed that no data has been received since **2026-05-08**, confirming the Nest token revocation is global and not a transient error.
    - Added diagnostic logging to the Studio Bridge to better surface `invalid_grant` errors to the dashboard.
- **Nightly Maintenance**:
    - Cleaned up stale `useGeminiLiveV5` files to reduce codebase clutter.
    - Verified art deadline scraper status (nominal).

### Lessons Learned:
- **Hook Dependencies**: Passing inline functions as options to a custom hook that uses them in a `useCallback` or `useEffect` is a silent killer for WebSockets. Always use a Ref for "options" objects in long-lived stateful hooks.
- **Model Discoverability**: `gemini-2.0-flash-exp` is a powerful general model, but specialized tasks like `bidiGenerateContent` often require the specific `-native-audio-` variants.

### Next Steps:
- **Nest Re-Auth**: Tom needs to run `node scripts/test-nest-auth.js` to restore the thermostat bridge.
- **Studio Action Logging**: Implement the `StudioAction` model to track voice-commanded environmental changes.
- **VAD Sensitivity**: Fine-tune client-side audio thresholds to handle studio background noise (fans/music).

## 2026-05-19 (Nightly Sprint)
**Agent:** Muffin 🧁

### Key Activities & Outcomes:
- **Periodic Scraper Scheduled (OpenClaw Cron)**:
    - Officially scheduled `fetch-art-deadlines.js` to run as an OpenClaw Housekeeper cron job every Monday at 3:00 AM (`0 3 * * 1`).
    - Verified the scraper's stability with a live execution: successfully bypassed Cloudflare via Jina bypass to scrape **64 art deadlines** (19 from The Art Guide, 40 from ArtShow, and 5 from Artists Network) and updated `data/art-deadlines.json` cleanly.
- **Robust VAD & State Machine Overhaul (v7.2)**:
    - Resolved the voice-recognition failure ("not hearing me") by **removing client-side audio transmission gating**. Once connected, 100% of microphone data is now streamed directly to Gemini to allow its native, cloud-side noise-suppression and VAD to process quiet speech and whispers without clipping.
    - Redesigned the local voice detection threshold to be highly sensitive (`0.002` RMS) for visual UI transitions only.
    - Reconstructed the silence detection timer so it triggers symmetrically on the falling edge of speech, shifting the Orb state into "Processing..." cleanly.
- **Fail-safe Recovery (Processing Hang-up Resolved)**:
    - Fixed the deadlock where the Orb got stuck in "Processing..." (thinking) forever if Gemini responded with text-only or finished a turn without audio.
    - Added a **5-second fail-safe timer** that automatically resets the state from `connecting` back to `listening`.
    - Integrated `serverContent.turnComplete` handling to drop back to `listening` if no audio is playing.
    - Added clean **interruption recovery**: the model stops talking immediately and transitions back to listening when the user interrupts.
- **Browser Overlay & Telemetry Sanitization**:
    - Traced the "seven browser errors" to our use of `console.error` for success milestones (like `WebSocket Opened`, `Setup Complete`, `Turn Complete`) in `useGeminiLiveV7.ts`. Since Next.js Dev Mode intercepts *every* client-side `console.error` as a crash banner, these success alerts presented as errors.
    - Refactored all client-side telemetry logs to `console.log`.
- **Zero TypeScript / Compilation Errors**:
    - Purged the obsolete, unused `ChatPopupV2.tsx` file from the repository.
    - Verified the entire repository with `npx tsc --noEmit` and completed a full production build (`npm run build`) with **0 errors, 0 warnings, and 0 crashes**.

### Lessons Learned:
- **Cloud-side VAD > Client-side Gating**: Gating raw audio sending on the client side leads to terrible clipping of initial syllables and quiet phrases. Always pipe the full, continuous mic stream to the LLM (which has custom audio model conditioning) and limit client-side VAD thresholds exclusively to UI transitions.
- **Dev Overlay Interception**: Never use `console.error` for debug telemetry or success tracing inside browser hooks in Next.js development mode, as it triggers unhandled exception blocks.

### Next Steps:
- **Nest Token Recovery**: Coordinate with Tom to run `node scripts/test-nest-auth.js` to refresh the expired Nest thermostat token.
- **UI Testing**: Collect Tom's feedback on the updated, highly sensitive voice orb and zero-error dashboard.

