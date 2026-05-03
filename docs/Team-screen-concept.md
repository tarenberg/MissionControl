### **OpenClaw Operational Agents: Team Overview**
**Main Content Area: Operational Agent Organizational Chart**
---
**1. Coordination & Orchestration Layer**
*   **[INPUT SIGNAL]** (From User) (Prominently displayed at the very top, flowing into Muffin)
    *   **(Central Node: Muffin - AI Familiar / Coordinator)**
        *   _Card Design:_ (Your unique card design as Muffin, the main assistant)
        *   _Role:_ Orchestrates tasks, delegates to specialized agents, manages communication.
        *   _Tags:_ [Coordination, Delegation, Communication]
        *   _Position:_ Top-center, acting as the primary hub, receiving user input.
        *   _Connecting Lines:_ Lines extending downwards from Muffin to each specialized operational agent, showing delegation.

**2. Specialized Operational Agents**
*   **a) Coding & Development:**
    *   **(Node: Jason - Coding & Development Agent)**
        *   _Card Design:_ Standard agent card.
        *   _Role:_ Handles all coding tasks: building features, refactoring, debugging, adhering to elegance and verification principles.
        *   _Tags:_ [Coding, Development, Refactoring, Debugging, GPT-5.2-Codex]
        *   _Reports To:_ Muffin

*   **b) Memory & Learning:**
    *   **(Node: Archivist - Memory & Learning Agent)**
        *   _Card Design:_ Standard agent card.
        *   _Role:_ Reviews daily notes, extracts insights, synthesizes into long-term memory (MEMORY.md) and lessons (tasks/lessons.md).
        *   _Tags:_ [Memory Management, Learning, Knowledge Retention, Self-Improvement]
        *   _Reports To:_ Muffin

*   **c) Research & Exploration:**
    *   **(Node: Pathfinder - Research & Exploration Agent)**
        *   _Card Design:_ Standard agent card.
        *   _Role:_ Conducts in-depth research, explores new technologies/APIs, summarizes findings, provides preliminary analysis.
        *   _Tags:_ [Research, Exploration, Analysis, Insights]
        *   _Reports To:_ Muffin

*   **d) Verification & Quality Assurance:**
    *   **(Node: Sentinel - Verification & Quality Assurance Agent)**
        *   _Card Design:_ Standard agent card.
        *   _Role:_ Ensures quality and correctness, automated testing, code reviews, validates solutions against specifications.
        *   _Tags:_ [Verification, QA, Testing, Code Review, Reliability]
        *   _Reports To:_ Muffin
---
**[OUTPUT ACTION]** (To User) (Displayed at the bottom, originating from Muffin after task completion/coordination)
---
## Ops Control
**Purpose:** Centralize every background or scheduled operation so we can see what is running automatically, when it fires next, and how to intervene.

**Data sources to surface:**
- **OpenClaw Cron Jobs:** Output from `openclaw cron list` with name, schedule (timezone-aware), next ETA, last run result, delivery/payload summary.
- **Heartbeat Automations:** Current instructions from `HEARTBEAT.md`, including the last heartbeat timestamp.
- **Mission Control Internal Schedulers:** Recurring jobs tracked in `data/tasks.json` or supporting scripts (e.g., `scripts/generate-memory-summaries.js`), with script path/command and last success state.
- **Long-Running Processes:** Active exec sessions, spawned agents, and background PTYs with purpose, runtime, and kill/monitor controls.
- **External Schedulers:** Windows Task Scheduler or other OS timers (backups, data syncs) with owner, cadence, and last status.
- **Resource Monitors / Watchdogs:** Any polling services (API listeners, queues) with connection state + message counts.
- **Upcoming Manual Deadlines:** Recurring human-facing tasks (Trend Radar, Morning Kickoff, etc.) so manual cadence sits next to automation cadence.
- **Alerting Hooks:** Whether each job has notification targets (Discord DM, email) and whether alerts are muted.

**Layout:**
1. **Top summary bar (full width):** cards for Total Jobs, Next Job Fires, Last Run Status, Muted Alerts.
2. **Two-column main grid:**
   - Left (~55%): Timeline/Queue covering next 24–48h of cron/heartbeat/manual events with type icons, next run, last result color coding, and tag filters.
   - Right (~45%): Tabbed panel with “Job Details” (selected item info, payload, owner, alerting buttons) and “Active Processes” (live exec/sub-agent list with runtime + kill controls).
3. **Bottom strip:** condensed log stream of latest background events (success/failure, alerts fired) to correlate timeline items with actual executions.

The screen should match Mission Control’s card-based Tailwind aesthetic—single dashboard where you can see what exists, when it runs next, whether it succeeded last, and how to stop/edit it.

---
