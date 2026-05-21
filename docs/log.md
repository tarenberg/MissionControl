# Mission Control - Change Log

## 2026-05-20
- **Standalone Telegram-Style VAT Chat**: Successfully built, compiled, and deployed the standalone, local-first secure workspace at `/chat`.
  - **Dynamic Multi-Agent Sidebar**: Multi-room switching between direct agents (Muffin 🧁, Jason 🛠️, Scout 🔍, and Sentinel 🛡️) or custom-spawned sessions.
  - **Premium UI / UX**: Beautiful "Loosely Twisted" dark-neomorphic styling with collapsible code blocks, structured inline command approval cards, and a drag-and-drop file upload workspace overlay.
  - **Hybrid Voice Input (5.c)**: Integrated the continuous `useVAT` hot-mic toggle directly into the input footer, supported by real-time voice feedback, global hotkeys (`Ctrl+M`), and auto-focusing textareas.
  - **Slash Shortcuts & Sync**: Populated quick-shortcuts autocomplete overlay list on `/` (matching `/status`, `/reset`, `/logs`, `/help`). Integrated 1.5s local database short-polling to sync state dynamically across Tailscale devices.
  - **Build & CI**: Verified perfect TypeScript and production compilation (`npm run build`), and pushed the master copy to the GitHub repository on branch `muffin/vat-chat`.

## 2026-05-16
- **System Recovery**: Resolved "no data" issue and port conflicts by terminating zombie Next.js processes and restarting the server on port 3000 with `--webpack`.
- **Task Board Cleanup**: Truncated `tasks/todo.md` to remove 450KB of automated error noise that was causing context overflows.
- **VAT Chat Tuning**:
  - Implemented **Continuous Listening** mode.
  - Removed Voice Activity Trigger (VAT) threshold switching; the mic now stays "hot" once toggled.
  - Connected "Send" button to voice completion and auto-restarts recording after AI finishes speaking.
  - **Fix**: Resolved race condition where recording failed to start automatically after toggle (state closure issue).
  - **Fix**: Resolved `ReferenceError` (TDZ) by removing cyclic dependencies in `ChatPopup.tsx`.
  - **Feature**: Added real-time voice-to-text feedback in the chat input using the Web Speech API.
  - **Feature**: Added "Mode Switching": focusing the input bar automatically disables voice mode; clicking the mic enables it.
- **Documentation**: Initialized `docs/log.md` to track project evolution.
