
## OpenClaw Configuration
- **OpenClaw Root Directory:** `C:\Users\tberg\.openclaw`
- **Main Config:** `C:\Users\tberg\.openclaw\openclaw.json`
- **Gateway Logs:** `\tmp\openclaw\openclaw-YYYY-MM-DD.log`
- **Agent Workspaces:** `C:\Users\tberg\.openclaw\workspace-{agentId}\`
- **Agent Config Dirs:** `C:\Users\tberg\.openclaw\agents\{agentId}\agent\` (models.json, auth-profiles.json)
- **Subagent Run History:** `C:\Users\tberg\.openclaw\subagents\runs.json`
- **Media Output:** `C:\Users\tberg\.openclaw\media\`
- **Always run `openclaw config validate` before `openclaw gateway restart`**
- **Correct model name:** `anthropic/claude-sonnet-4-6` (NOT `claude-4-6-sonnet` — wrong order causes silent fallback to Gemini and crashes)
- **Crash diagnosis:** Check `\tmp\openclaw\openclaw-YYYY-MM-DD.log` for `FailoverError` or `Unknown model` errors before assuming context overflow

## Mission Control (MC) Development
- **Tailscale IP (Twisted):** `100.109.216.115`
- **Primary Projects Directory:** `C:\Users\tberg\Documents\_PROJECTS` (All new projects should be built here).
- **MC Dev Server:** Start with `npx next dev --hostname 0.0.0.0 --webpack` to allow remote access and avoid Turbopack HMR panics.
- **Allowed Origins:** `next.config.ts` must include laptop Tailscale IP (`100.122.131.19`) in `allowedDevOrigins`.
- **Project Spin-Up:**
    - **Next.js:** Use `-p {port} -H 0.0.0.0`
    - **Vite:** Use `--port {port} --host 0.0.0.0`
    - **SSL:** If `basicSsl` is present in `package.json`, the dev server uses `https://`. Browser will require "Proceed (unsafe)" for local dev certs.
- **Process Management:** Use targeted PID kills for port 3000 to avoid closing the OpenClaw gateway.


## 2026-05-01
* Successfully resolved OpenAI API rate limiting issues.
* Transitioned to the "Muffin 🧁" persona and implemented a nightly cron job for autonomous sprints.
* Built a scraper for art competition deadlines, integrated it into Mission Control, and decoupled data into a JSON file.
* Hardened the `main.tsx` component with a global error boundary/reporting mechanism for production stability.

## 2026-04-30
* Stabilized the OpenClaw gateway and resolved persistent API errors.
* Cleaned up duplicate directories in the Mission Control workspace and synced the SQLite database.
* Standardized HTTPS access for all local dev projects (Next.js, Vite, Static) to avoid protocol conflicts.
* Resolved React build failures caused by raw emoji characters; adopted Unicode escape sequences.


## 2026-05-04
* Implemented a real-time log viewer on the dashboard for monitoring Gateway and App logs.
* Introduced global dark mode theme to Mission Control with CSS variables and theme-aware colors.
* Integrated an animated logo component (`Logo.tsx`) with hover-reset logic.
* Locked specialized agents to economy-tier models (Gemini Flash, Ollama) to control Anthropic spend.


## 2026-05-05
Here is a summary of the daily log in 3-5 bullet points:

* Completed the "Loosely Twisted" UI overhaul for the Mission Control dashboard, including all modals and confirmation flows.
* Implemented various technical improvements, such as watchdog hardening to ensure the remote-accessible development environment is restored in case of service failure, and refactored several components to improve stability and performance.
* Successfully migrated art deadlines into a JSON file and hardcoded subagents to minimize Anthropic credit usage.


## 2026-05-08
Here are the key takeaways:

* Resolved Art Tracker 404 error by renaming the directory to `app/art-tracker` and updating internal navigation links and project metadata in the database.
* Fixed OpenClaw provider issue with `openclaw.json` settings, resolving "Unknown model" errors for Housekeeper agent.
* Standardized shell-based telemetry call timeouts in Mission Control to prevent event-loop blocking and dashboard stalls.


## 2026-05-12
- Transition recommended to `google/gemini-2.5-pro`  to replace unavailable `ollama/llama3` model. 
- "Heartbeat Refresh" job encountered an unknown error at 10:00 AM despite `HEARTBEAT.md` remaining in a nominal state. Investigate further.
- Google Cloud APIs for AI costs (Gmail) and logistics (Calendar) are blocked due to `403 accessNotConfigured` errors. Manual activation required in the Google Cloud Console for project 792605632195.
