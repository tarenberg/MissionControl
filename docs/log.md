# Mission Control - Change Log

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
