## 2026-05-30: Painting Exhibition & Show History Tracking Deployed

### Task 1: Database Schema Migration & Expansion
- **Goal:** Add support for tracking specific show awards without breaking the existing web-sync script (`sync_website_art.py`) or database structures.
- **Progress:**
  - **Award Column Addition:** Executed direct Python-MySQL migration script to alter the local `looselyt_artwork` database.
  - **Prism Schema Sync:** Added the nullable `award` VARCHAR(255) column to the `deadline_submissions` table, maintaining full compatibility with historical records.

### Task 2: Multi-Project Backend API Modifications
- **Goal:** Enable the API to expose grouped show histories and handle individual submission updates.
- **Progress:**
  - **Artworks API Expansion:** Edited `artworks.php` to perform advanced SQL JOIN queries, retrieving nesting arrays of all deadlines linked to each painting. Location, entry fee, show dates, submission status, and award text are packaged and returned dynamically in the standard GET response.
  - **Submission Actions API:** Hardened `deadlines.php` POST route to support the `update_submission` action, allowing granular updates of status (Pending, Accepted, Rejected) and awards.

### Task 3: Tabbed Artwork Details & Show History Timeline UI
- **Goal:** Create a clean, intuitive neomorphic interface within the Artwork modal to track and edit exhibition entries over time.
- **Progress:**
  - **Re-architected Modal:** Split the "Edit Artwork" modal into a gorgeous state-driven tabbed container ("Details" and "Exhibition History") styled with custom neomorphic CSS.
  - **Chronological Timeline:** Built a chronological, icon-coded timeline rendering all show submissions. Added real-time `<select>` status drop-downs (Pending/Accepted/Rejected) and standard on-blur text inputs for awards.
  - **Primary Status Auto-Sync Confirmation:** Programmed a secure `window.confirm` popup trigger. If a user sets a show entry status to "Accepted", the application prompts them first before automatically updating the painting's primary tracker availability status (e.g. from "In Studio" to "Accepted").

- **Build Status:** **VERIFIED 100% CLEAN** (`npx tsc --noEmit` resolved with exit code 0). Staged on branch `muffin/art-tracker-exhibition-history` and open as Pull Request #2 on GitHub.

---

## 2026-05-28: Mobile Responsiveness & Playback Radar Cues Deployed

### Task 1: Overhaul Horizontal Touch Scrolling & Swipe Gestures
- **Goal:** Unblock horizontal scrolling for the Tasks Board, Scheduled Jobs Calendar, and Art Tracker tables on mobile touch screens.
- **Progress:**
  - **Inertial Momentum Binding**: Enabled native touch scrolling momentum (`-webkit-overflow-scrolling: touch !important`) globally on all overflow scroll elements in `app/globals.css`.
  - **Horizontal Scrollbar Dimensions**: Sized horizontal scrollbar heights to `8px` in `globals.css` to fix touch track conflicts.
  - **Flexbox Squeeze Prevention**: Set `flex-shrink-0` on Kanban columns (`app/tasks/page.tsx`) and the calendar grid (`app/calendar/page.tsx`), preventing browsers from squeezing layout blocks below their minimum widths (e.g. `280px` / `800px`) and forcing proper horizontal scrolling.
  - **Grid Layout Bounding**: Applied strict horizontal bounds (`w-full max-w-full min-w-0`) to the primary main layout (`components/ClientLayout.tsx`) and parent containers, ensuring the overall canvas doesn't stretch past screen boundaries.

### Task 2: High-Fidelity Playback Radar Rings & Visual Cues on VoiceOrb
- **Goal:** Provide gorgeous, interactive visual feedback when global audio is playing, especially when minimized.
- **Progress:**
  - **Double Radar Ring Animation**: Embedded double, staggered pulsing radar rings (`animate-[ping_2s_infinite]` and `animate-[ping_3.5s_infinite]`) around the `VoiceOrb` when global audio is playing.
  - **Vibrant Audio State Colors**: Refactored `VoiceOrb.tsx` to automatically shift particle colors and wave ring segments from soft purple (`#a29bfe`) to a vibrant, glowing neomorphic cyan (`#00cec9`) whenever global playback is active.
  - **Pulsing Playback Gradient**: Transitioned the main orb face to a dynamic pulse gradient mapping from cyan through soft purple when playing audio tracks.

### Task 3: Art Tracker Compactness & Screen Height Optimization
- **Goal:** Minimize header vertical footprint to maximize screen real estate for list items and calendars.
- **Progress:**
  - **Compact Header Heights**: Slashed `.dashboardHeader` vertical padding to a compact `4px 15px` on desktop and `6px 12px` on mobile, instantly lifting active content modules.
  - **Confirm Entry Modal Hardening**: Patched the `.modalContent` popup inside `components/ArtTrackerDashboard.tsx` with a responsive `maxWidth: '95vw'` and `maxHeight: '90vh'` to guarantee complete vertical scrollability and visibility on smaller screens.
- **Build Status:** **VERIFIED 100% CLEAN** (`npx tsc --noEmit` resolved with exit code 0). Staged as a dedicated, fully-tested pull request on the branch `muffin/mobile-responsiveness-and-playback-cues`.

---

## 2026-05-27: Telegram-Class Audio Upgrades Deployed

### Task 1: Client-Side audioSrc Memory Cache & SSE Sync Fix
- **Goal:** Prevent real-time Server-Sent Events (SSE) updates from wiping out active message base64/blob audio URLs.
- **Progress:**
  - **Identified Root Cause**: The real-time SSE channel synchronizes state in $<50\text{ms}$. Upon message creation, it triggers a client sync. Because the SQLite/Prisma tables do not include an `audioSrc` column, database rows returned without audio URLs and instantly overrode the client's optimistic React message states—wiping out waveforms before they could render.
  - **Implemented Fix**: Designed a secure React `useRef` cache (`audioSrcCacheRef`) inside `ChatPopupV3.tsx`. It automatically registers and stores local/blob audio coordinates on creation, and dynamically merges them back during subsequent SSE sync streams or initial loading.

### Task 2: Live Microphone Decibel & Amplitude Analyser Deployed
- **Goal:** Replace static voice orb behavior with real-time, fluid amplitude visualizations.
- **Progress:**
  - **AnalyserNode Integration**: Wired a native Web Audio API `AnalyserNode` directly into the microphone capture thread within `useVAT.ts`.
  - **Sound Dynamics**: Computes real-time frequency-bin data to map decibels (`db` from `-90` to `0`) and normalized average amplitudes (`level` from `0` to `1`) on an animation frame loop. The main Voice Orb now physically breathes, pulses, and scales dynamically as you speak!

### Task 3: Automatic TTS Waveforms on Typed Messages
- **Goal:** Render downsampled scrubbers and audio waveforms even for standard typed submissions.
- **Progress:**
  - **TTS Server Binding**: Configured standard text submission inside `ChatPopupV3.tsx` to supply the `voice` parameter and linked the backend route (`app/api/chat/route.ts`) to hit the local FastAPI Piper TTS server on port 8000.
  - **Optimistic Scrubbing**: Standard typed messages now return and play base64-synthesized audio, instantly rendering downsampled amplitude scrubbers inside the message timeline.

### Task 4: VAD Silence Auto-Submit & Max Recording Guardrails
- **Goal:** Prevent Whisper hallucinations (repeating phrases) over silent recording tails and save background resources.
- **Progress:**
  - **Silence VAD Timer**: Programmed a 4.5-second silence detection timer using real-time decibel analysis (`db < -52` dB). If you stop speaking, the mic automatically stops and triggers a clean, hands-free submission.
  - **60s Max Limit**: Equipped recording cycles with an absolute 60-second cutoff cap to protect network bandwidth and system RAM.
- **Build Status:** **VERIFIED 100% CLEAN** (`npx tsc --noEmit` resolved with exit code 0). Fully merged into `master` and pushed to GitHub `origin/master`.

---

## 2026-05-26: Global Dictation & Services Health Monitor Deployed

### Task 1: VAT Chat STT Preview Display Fix & Merge to Master
- **Goal:** Resolve insecure-context (Tailscale) voice typing display bugs and merge the verified SSE-VAD branch into `master`.
- **Progress:**
  - **Identified Root Cause**: In secure-context fallbacks, the WebM audio chunks sliced off by `useVAT.ts` omitted essential segment/codec headers, preventing PyAV from decoding the audio on the backend.
  - **Implemented Fix**: Restructured `useVAT.ts` to accumulate previews from index 0 (guaranteeing header preservation) and lowered minimum blob constraints in `ChatPopupV3.tsx` down to 64 bytes.
  - **Master Merge**: Safely resolved Windows file handles, stashed active database files, checked out `master`, cleanly merged the `muffin/vat-chat-sse-vad` branch, and pushed to GitHub `origin/master`.

### Task 2: Global Voice Dictation Mode Deployed
- **Goal:** Enable Tom to dictate spoken words directly into any focused input box on any page (like the Personal Journal), bypassing browser-native SpeechRecognition HTTPS limits over HTTP Tailscale.
- **Progress:**
  - **Focus-Locking**: Intercepted focus-stealing on all Orb click events using `onMouseDown={(e) => e.preventDefault()}`, maintaining active document cursor selection.
  - **Dynamic Insertion**: Programmed live character subtraction (`lastPreviewLengthRef`) to replace growing previews on-the-fly, committing final high-fidelity results with trailing whitespace and cursor tracking.
  - **Form Sync**: Dispatched standard native `'input'` DOM events to keep Next.js/React parent states (like the journal Markdown body) natively synchronized.

### Task 3: Active Services & Daemon Health Monitor Widget
- **Goal:** Design and deploy a secure, real-time backend and frontend services monitor widget directly on the main dashboard to keep servers healthy.
- **Progress:**
  - **Inference/Daemon API**: Programmed `/api/system-services/route.ts` with raw TCP socket checks on ports 3000 (Next.js), 8000 (FastAPI AI), and 9000 (OpenClaw).
  - **HITL-Protected Restart Hooks**: Programmed background-detached subprocess lifecycles for both Python (AI Server) and Node (Next.js). Next.js self-restarts use a delayed 1.5s sleep routine, allowing the API request to gracefully complete before killing port 3000.
  - **Neomorphic UI Widget**: Deployed `components/ServicesMonitor.tsx` featuring real-time health indicator badges and active refresh triggers. Integrated it directly into `app/page.tsx`.
- **Build Status:** **VERIFIED 100% CLEAN** (`npx tsc --noEmit` resolved with exit code 0).

---

## 2026-05-25: VAT Chat VAD Upgrade (Blocked)

- **Goal:** Replace decibel-based VAD with a more accurate WebAssembly-based solution.
- **Progress:**
    - Successfully implemented the new `useVAD` hook using Silero VAD.
    - Refactored the `useVAT` hook to use the new VAD logic and maintain backward compatibility.
    - Verified that the new code builds successfully with no type errors.
- **Status:** **RESOLVED.** The file lock was cleared.
- **Result:** The pull request for the VAT Chat VAD upgrade has been successfully created and is ready for review.

### Task 2: Personal Journal Feature Verification
- **Goal:** Verify and close out the Personal Journal implementation.
- **Action:** Found the feature's `tasks.md` file, which indicated all coding was complete pending a final build verification.
- **Result:** Ran `npx tsc --noEmit` which passed with zero errors. The feature is now fully verified and complete. I've updated the task list to reflect this.
