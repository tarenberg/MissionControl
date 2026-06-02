#!/usr/bin/env python3
"""
housekeeper.py — Gemma-powered housekeeping agent for the workspace.

Runs on gemma2:latest via local Ollama (localhost:11434).

Tasks (all safe to run any time — idempotent):
  1. heartbeat     — update memory/heartbeat-state.json
  2. daily-memory  — ensure today's memory/YYYY-MM-DD.md exists
  3. kickoff       — if 6–10am and no kickoff exists today, generate one via Gemma
  4. consolidate   — if yesterday's daily log is substantive, ask Gemma to distill
                     a summary entry and append it to MEMORY.md

Usage:
  python scripts/housekeeper.py [--task heartbeat|daily-memory|kickoff|consolidate|all]
  (default: all)
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

WORKSPACE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MEMORY_DIR = os.path.join(WORKSPACE, "memory")
MEMORY_MD = os.path.join(WORKSPACE, "MEMORY.md")
HEARTBEAT_FILE = os.path.join(MEMORY_DIR, "heartbeat-state.json")

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "gemma2:latest"
OLLAMA_TIMEOUT = 120  # seconds

KICKOFF_HOUR_START = 6
KICKOFF_HOUR_END = 10

# ---------------------------------------------------------------------------
# Ollama helper
# ---------------------------------------------------------------------------

def ask_gemma(prompt: str, context_note: str = "") -> str | None:
    """Send a prompt to gemma2 via Ollama. Returns response text or None on failure."""
    payload = json.dumps({
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }).encode()

    req = urllib.request.Request(
        OLLAMA_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return body.get("response", "").strip()
    except urllib.error.URLError as e:
        print(f"[housekeeper] Ollama unreachable ({context_note}): {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[housekeeper] Gemma call failed ({context_note}): {e}", file=sys.stderr)
        return None

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")

def yesterday_str() -> str:
    return (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

def read_file(path: str) -> str | None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return None

def write_file(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def append_file(path: str, content: str) -> None:
    with open(path, "a", encoding="utf-8") as f:
        f.write(content)

def is_substantive(content: str | None) -> bool:
    """True if content has more than 2 non-header, non-empty lines."""
    if not content:
        return False
    lines = [
        l for l in content.splitlines()
        if l.strip() and not l.startswith("#") and "TODO: record highlights" not in l
    ]
    return len(lines) > 2

# ---------------------------------------------------------------------------
# Task 1: Heartbeat
# ---------------------------------------------------------------------------

def task_heartbeat() -> None:
    now = int(time.time() * 1000)
    state: dict = {
        "lastChecks": {"email": None, "calendar": None, "weather": None, "heartbeat": None},
        "lastRun": None,
        "status": "ok",
    }

    existing = read_file(HEARTBEAT_FILE)
    if existing:
        try:
            state = {**state, **json.loads(existing)}
        except json.JSONDecodeError:
            pass

    state["lastChecks"]["heartbeat"] = now
    state["lastRun"] = now
    state["status"] = "ok"

    write_file(HEARTBEAT_FILE, json.dumps(state, indent=2))
    print(f"[heartbeat] Updated — {datetime.fromtimestamp(now / 1000).isoformat()}")

# ---------------------------------------------------------------------------
# Task 2: Daily memory
# ---------------------------------------------------------------------------

DAILY_TEMPLATE = """\
# Daily Log — {date}

## Key Activities & Outcomes
<!-- TODO: record highlights here -->

## Lessons Learned
<!-- What did today teach you? -->

## Tomorrow's Focus
<!-- What's the most important thing for tomorrow? -->
"""

def task_daily_memory() -> None:
    date = today_str()
    path = os.path.join(MEMORY_DIR, f"{date}.md")
    if os.path.exists(path):
        print(f"[daily-memory] Already exists: {date}.md — skipping.")
        return
    write_file(path, DAILY_TEMPLATE.format(date=date))
    print(f"[daily-memory] Created: {date}.md")

# ---------------------------------------------------------------------------
# Task 3: Morning kickoff
# ---------------------------------------------------------------------------

def task_kickoff() -> None:
    hour = datetime.now().hour
    if not (KICKOFF_HOUR_START <= hour < KICKOFF_HOUR_END):
        print(f"[kickoff] Outside kickoff window ({hour}:xx) — skipping.")
        return

    date = today_str()
    report_path = os.path.join(MEMORY_DIR, f"morning_kickoff_report_{date}.md")
    if os.path.exists(report_path):
        print(f"[kickoff] Report already exists for {date} — skipping.")
        return

    # Gather context
    yesterday = yesterday_str()
    yesterday_log = read_file(os.path.join(MEMORY_DIR, f"{yesterday}.md")) or "No log for yesterday."
    memory_md = read_file(MEMORY_MD) or "No MEMORY.md found."
    todo_content = read_file(os.path.join(WORKSPACE, "tasks", "todo.md")) or "No todo.md found."

    # External Data: Weather (New Haven)
    weather = "Weather data unavailable."
    try:
        req = urllib.request.Request(
            "https://wttr.in/New+Haven?format=3",
            headers={"User-Agent": "curl/7.64.1"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            weather = response.read().decode('utf-8').strip()
    except Exception as e:
        print(f"[kickoff] Weather fetch failed: {e}")

    # External Data: Calendar (Tom Arenberg)
    calendar_events = "Calendar data unavailable (Token expired or gog login required)."
    try:
        # We specify the calendar title 'Tom Arenberg' as requested
        cal_res = subprocess.run(["gog", "calendar", "list", "--days", "1"], capture_output=True, text=True, encoding='utf-8', timeout=10)
        if cal_res.returncode == 0:
            calendar_events = cal_res.stdout.strip() or "No appointments found for today."
    except Exception as e:
        print(f"[kickoff] Calendar fetch failed: {e}")

    prompt = f"""\
You are a studio assistant helping Tom Arenberg, a contemporary fine artist in New Haven, CT.
It's the morning of {date}. Write a brief, warm morning kickoff in plain markdown (no emojis).

Use only the information below — do not invent facts.

## Weather
{weather}

## Today's Appointments (Tom Arenberg Calendar)
{calendar_events}

## Yesterday's Log
{yesterday_log[:1500]}

## Long-Term Memory (highlights)
{memory_md[:1000]}

## Current Tasks (todo.md)
{todo_content[:800]}

Write:
1. A 2-sentence "Good morning" greeting referencing something real from yesterday or the task list.
2. A "Today's Focus" section: 3 bullet points — the most important things to do today based on tasks.
3. A "Watch For" section: 1-2 things that might need attention (based on open tasks or blockers).

Keep it concise — under 200 words total.
"""

    print("[kickoff] Asking Gemma for morning kickoff...")
    response = ask_gemma(prompt, context_note="kickoff")
    if not response:
        print("[kickoff] No response from Gemma — aborting.")
        return

    report = f"# Morning Kickoff — {date}\n\n{response}\n"
    write_file(report_path, report)
    print(f"[kickoff] Report written to memory/morning_kickoff_report_{date}.md")

# ---------------------------------------------------------------------------
# Task 4: Memory consolidation
# ---------------------------------------------------------------------------

def task_consolidate() -> None:
    yesterday = yesterday_str()
    log_path = os.path.join(MEMORY_DIR, f"{yesterday}.md")
    log_content = read_file(log_path)

    if not is_substantive(log_content):
        print(f"[consolidate] Yesterday's log ({yesterday}.md) is sparse — skipping.")
        return

    # Check if MEMORY.md already has an entry for yesterday
    memory_content = read_file(MEMORY_MD) or ""
    if yesterday in memory_content:
        print(f"[consolidate] MEMORY.md already has an entry for {yesterday} — skipping.")
        return

    prompt = f"""\
You are distilling a raw daily log into a 3-5 bullet point long-term memory entry.
Date: {yesterday}

Raw log:
{log_content[:2000]}

Write ONLY 3-5 bullet points (markdown list, no header) summarising:
- Key decisions made
- Work completed
- Important lessons
- Anything Tom should remember weeks from now

Be factual, concise, and specific. No filler phrases.
"""

    print(f"[consolidate] Asking Gemma to summarise {yesterday}.md...")
    response = ask_gemma(prompt, context_note="consolidate")
    if not response:
        print("[consolidate] No response from Gemma — aborting.")
        return

    entry = f"\n\n## {yesterday}\n{response}\n"
    append_file(MEMORY_MD, entry)
    print(f"[consolidate] Appended summary for {yesterday} to MEMORY.md")

# ---------------------------------------------------------------------------
# Task 5: Sync projects
# ---------------------------------------------------------------------------

def task_sync_projects() -> None:
    mc_dir = r"C:\Users\tberg\Documents\_PROJECTS\MissionControl"
    script_path = os.path.join(mc_dir, "scripts", "sync-projects.js")
    
    if not os.path.exists(script_path):
        print(f"[sync-projects] Script not found at {script_path} — skipping.")
        return

    print("[sync-projects] Running project sync...")
    import subprocess
    try:
        result = subprocess.run(
            ["node", "scripts/sync-projects.js"],
            cwd=mc_dir,
            capture_output=True,
            text=True,
            check=True
        )
        print(f"[sync-projects] {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        print(f"[sync-projects] Failed: {e.stderr}", file=sys.stderr)

# ---------------------------------------------------------------------------
# Task 6: Harvest GitHub
# ---------------------------------------------------------------------------

def task_harvest_github() -> None:
    mc_dir = r"C:\Users\tberg\Documents\_PROJECTS\MissionControl"
    script_path = os.path.join(mc_dir, "scripts", "harvest-github.js")
    
    if not os.path.exists(script_path):
        print(f"[harvest-github] Script not found at {script_path} — skipping.")
        return

    print("[harvest-github] Running GitHub harvest...")
    import subprocess
    try:
        result = subprocess.run(
            ["node", "scripts/harvest-github.js"],
            cwd=mc_dir,
            capture_output=True,
            text=True,
            check=True
        )
        print(f"[harvest-github] {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        print(f"[harvest-github] Failed: {e.stderr}", file=sys.stderr)

# ---------------------------------------------------------------------------
# Task 7: Clone Missing Projects
# ---------------------------------------------------------------------------

def task_clone_missing() -> None:
    mc_dir = r"C:\Users\tberg\Documents\_PROJECTS\MissionControl"
    script_path = os.path.join(mc_dir, "scripts", "clone-missing.js")
    
    if not os.path.exists(script_path):
        print(f"[clone-missing] Script not found at {script_path} — skipping.")
        return

    print("[clone-missing] Checking for missing local projects...")
    import subprocess
    try:
        result = subprocess.run(
            ["node", "scripts/clone-missing.js"],
            cwd=mc_dir,
            capture_output=True,
            text=True,
            check=True
        )
        print(f"[clone-missing] {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        print(f"[clone-missing] Failed: {e.stderr}", file=sys.stderr)

# ---------------------------------------------------------------------------
# Task 8: Nightly Sprint Triage
# ---------------------------------------------------------------------------

def task_nightly_sprint() -> None:
    # Only run between 11 PM and 5 AM
    current_hour = datetime.now().hour
    if not (23 <= current_hour or current_hour < 5):
        return

    print("[nightly-sprint] Initiating autonomous task triage...")
    # This will be expanded to call the triage agent
    # For now, it logs the intent
    log_path = r"C:\Users\tberg\.openclaw\workspace\docs\Nightly-Log.md"
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n[{datetime.now().isoformat()}] Sprint heartbeat: Scanning Mission Control tasks...")

# ---------------------------------------------------------------------------
# Task 9: Process Prospectus Requests
# ---------------------------------------------------------------------------

def task_process_prospectus() -> None:
    mc_dir = r"C:\Users\tberg\Documents\_PROJECTS\MissionControl"
    script_path = os.path.join(mc_dir, "scripts", "process-prospectus.js")
    
    if not os.path.exists(script_path):
        print(f"[process-prospectus] Script not found at {script_path} — skipping.")
        return

    print("[process-prospectus] Processing prospectus requests...")
    import subprocess
    try:
        result = subprocess.run(
            ["node", "scripts/process-prospectus.js"],
            cwd=mc_dir,
            capture_output=True,
            text=True,
            check=True
        )
        print(f"[process-prospectus] {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        print(f"[process-prospectus] Failed: {e.stderr}", file=sys.stderr)

# ---------------------------------------------------------------------------
# Task 10: Process Google Drive Inbox
# ---------------------------------------------------------------------------

def task_gdrive_inbox() -> None:
    script_path = os.path.join(WORKSPACE, "scripts", "gdrive-inbox-filer.py")
    if not os.path.exists(script_path):
        print(f"[gdrive-inbox] Script not found at {script_path} — skipping.")
        return

    print("[gdrive-inbox] Running Google Drive inbox file sync...")
    import subprocess
    try:
        result = subprocess.run(
            ["python", "scripts/gdrive-inbox-filer.py"],
            cwd=WORKSPACE,
            capture_output=True,
            text=True,
            check=True
        )
        print(f"[gdrive-inbox] {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        print(f"[gdrive-inbox] Failed: {e.stderr}", file=sys.stderr)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

TASKS = {
    "heartbeat": task_heartbeat,
    "daily-memory": task_daily_memory,
    "kickoff": task_kickoff,
    "consolidate": task_consolidate,
    "sync-projects": task_sync_projects,
    "harvest-github": task_harvest_github,
    "clone-missing": task_clone_missing,
    "nightly-sprint": task_nightly_sprint,
    "process-prospectus": task_process_prospectus,
    "gdrive-inbox": task_gdrive_inbox,
}

def main() -> None:
    parser = argparse.ArgumentParser(description="Workspace housekeeping agent (Gemma-powered)")
    parser.add_argument(
        "--task",
        choices=[*TASKS.keys(), "all"],
        default="all",
        help="Which task to run (default: all)",
    )
    args = parser.parse_args()

    if args.task == "all":
        for name, fn in TASKS.items():
            try:
                fn()
            except Exception as e:
                print(f"[housekeeper] Task '{name}' failed: {e}", file=sys.stderr)
    else:
        try:
            TASKS[args.task]()
        except Exception as e:
            print(f"[housekeeper] Task '{args.task}' failed: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()
