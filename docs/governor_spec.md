# Governor Dashboard — Complete Project Specification
**Version:** 1.0  
**Purpose:** This document is a complete specification intended for direct code generation. An AI agent should be able to read this file and write every listed file to disk without requiring further clarification.

---

## 0. Guiding Principles

1. **The Brain is the server.** FastAPI is the single process. No PHP, no `shell_exec()`, no intermediary.
2. **Every write flows through the API.** The frontend never touches the database directly.
3. **SQLite is the source of truth.** No JSON files for persistence.
4. **Fail loudly on startup, gracefully at runtime.** Missing config = crash at boot. LLM failure = degrade, not crash.
5. **Security from day one.** Auth is not optional.

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language | Python | 3.11+ |
| API Framework | FastAPI | 0.111+ |
| Data Validation | Pydantic v2 | 2.x |
| Database | SQLite (WAL mode) | Built-in |
| Database Driver | aiosqlite | 0.20+ |
| Config Management | pydantic-settings | 2.x |
| Auth | FastAPI + JWT (python-jose) | — |
| Password Hashing | passlib[bcrypt] | — |
| HTTP Client (async) | httpx | 0.27+ |
| Job Scheduling | APScheduler | 3.x |
| LLM Provider | Google Gemini (default) | google-generativeai |
| Frontend | Alpine.js 3.x + Vanilla JS | CDN, no build step |
| Real-time | Server-Sent Events (SSE) | Built into FastAPI |

---

## 2. Project Root Structure

```
governor/
├── .env                          # Environment variables (never commit)
├── .env.example                  # Template for .env
├── requirements.txt
├── main.py                       # FastAPI app entry point
├── config.py                     # pydantic-settings config
├── database.py                   # SQLite connection, migrations, pragmas
│
├── routers/
│   ├── __init__.py
│   ├── auth.py                   # Login, token endpoints
│   ├── goals.py
│   ├── tasks.py
│   ├── resources.py
│   ├── memories.py
│   ├── decisions.py
│   ├── briefing.py
│   └── events.py                 # SSE stream
│
├── schemas/
│   ├── __init__.py
│   ├── auth.py
│   ├── goals.py
│   ├── tasks.py
│   ├── resources.py
│   ├── memories.py
│   ├── decisions.py
│   └── briefing.py
│
├── services/
│   ├── __init__.py
│   ├── goal_service.py
│   ├── task_service.py
│   ├── resource_service.py
│   ├── memory_service.py
│   ├── decision_service.py
│   ├── briefing_service.py
│   ├── llm.py                    # LLM abstraction layer
│   ├── scheduler.py              # APScheduler setup
│   └── sse_manager.py            # SSE connection registry
│
├── migrations/
│   ├── 001_initial_schema.sql
│   └── migration_runner.py
│
└── dashboard/
    ├── index.html
    ├── app.js
    └── style.css
```

---

## 3. Environment & Configuration

### 3.1 `.env.example`
```
# Server
HOST=127.0.0.1
PORT=8000
DEBUG=false

# Security
SECRET_KEY=replace_this_with_a_long_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database
DATABASE_PATH=./governor.db

# LLM
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
LLM_TIMEOUT_SECONDS=30
LLM_MAX_RETRIES=2

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

### 3.2 `config.py`
Use `pydantic-settings` `BaseSettings`. All fields must have types. Any missing required field raises a `ValidationError` at startup — the app must not start with invalid config.

```python
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List

class Settings(BaseSettings):
    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = False

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    database_path: str = "./governor.db"

    llm_provider: str = "gemini"
    gemini_api_key: str
    llm_timeout_seconds: int = 30
    llm_max_retries: int = 2

    allowed_origins: List[str] = ["http://localhost:8000"]

    @field_validator("secret_key")
    @classmethod
    def secret_key_must_be_strong(cls, v):
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 4. Database

### 4.1 `database.py`

This module manages the async SQLite connection pool. Two pragmas **must** be set on every new connection:

```python
PRAGMA journal_mode=WAL;   # concurrent reads during writes
PRAGMA foreign_keys=ON;    # enforce FK constraints (off by default in SQLite)
```

Provide:
- `get_db()` — async generator dependency for FastAPI routes
- `init_db()` — called at startup, runs migration runner
- A context manager for raw connections in services

### 4.2 Migration System (`migrations/migration_runner.py`)

- Maintain a `schema_migrations` table: `(id INTEGER PRIMARY KEY, version INTEGER UNIQUE, applied_at TEXT)`
- On startup, check current version against files in `migrations/`
- Run any unapplied `.sql` files in order
- Never re-run an applied migration
- Log each migration applied

### 4.3 `migrations/001_initial_schema.sql`

```sql
-- Goals
CREATE TABLE IF NOT EXISTS goals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','active','paused','completed','archived')),
    stage       TEXT NOT NULL DEFAULT 'planning'
                    CHECK(stage IN ('planning','research','prototyping','development','review','done')),
    priority    INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
    due_date    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id         INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending','active','completed','blocked','cancelled')),
    priority        INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    due_date        TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Task Dependencies (adjacency list)
CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_id),
    CHECK(task_id != depends_on_id)
);

-- Resources
CREATE TABLE IF NOT EXISTS resources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id     INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    task_id     INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK(type IN ('link','file','note','contact')),
    title       TEXT NOT NULL,
    value       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK(goal_id IS NOT NULL OR task_id IS NOT NULL)
);

-- Memories
CREATE TABLE IF NOT EXISTS memories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    content     TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'general'
                    CHECK(category IN ('general','learning','decision','insight','reference')),
    tags        TEXT NOT NULL DEFAULT '[]',   -- JSON array stored as text
    goal_id     INTEGER REFERENCES goals(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Decisions
CREATE TABLE IF NOT EXISTS decisions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    context         TEXT NOT NULL,
    decision        TEXT NOT NULL,
    rationale       TEXT,
    alternatives    TEXT NOT NULL DEFAULT '[]',  -- JSON array
    goal_id         INTEGER REFERENCES goals(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK(status IN ('active','revisit','superseded')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Briefings (stored history)
CREATE TABLE IF NOT EXISTS briefings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    content     TEXT NOT NULL,
    model_used  TEXT NOT NULL,
    prompt_hash TEXT,             -- SHA256 of input context, for deduplication
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users (single-user for now, but structured for extensibility)
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- FTS5 Virtual Table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    entity_type,    -- 'goal' | 'task' | 'memory' | 'decision'
    entity_id,
    title,
    content,
    tokenize='porter ascii'
);

-- Triggers to keep search_index in sync
CREATE TRIGGER IF NOT EXISTS goals_fts_insert AFTER INSERT ON goals BEGIN
    INSERT INTO search_index(entity_type, entity_id, title, content)
    VALUES ('goal', new.id, new.title, COALESCE(new.description, ''));
END;

CREATE TRIGGER IF NOT EXISTS goals_fts_update AFTER UPDATE ON goals BEGIN
    DELETE FROM search_index WHERE entity_type='goal' AND entity_id=old.id;
    INSERT INTO search_index(entity_type, entity_id, title, content)
    VALUES ('goal', new.id, new.title, COALESCE(new.description, ''));
END;

CREATE TRIGGER IF NOT EXISTS goals_fts_delete AFTER DELETE ON goals BEGIN
    DELETE FROM search_index WHERE entity_type='goal' AND entity_id=old.id;
END;

-- (Repeat trigger pattern for tasks, memories, decisions)

-- updated_at auto-update triggers
CREATE TRIGGER IF NOT EXISTS goals_updated_at AFTER UPDATE ON goals BEGIN
    UPDATE goals SET updated_at=datetime('now') WHERE id=new.id;
END;

CREATE TRIGGER IF NOT EXISTS tasks_updated_at AFTER UPDATE ON tasks BEGIN
    UPDATE tasks SET updated_at=datetime('now') WHERE id=new.id;
END;

CREATE TRIGGER IF NOT EXISTS memories_updated_at AFTER UPDATE ON memories BEGIN
    UPDATE memories SET updated_at=datetime('now') WHERE id=new.id;
END;

CREATE TRIGGER IF NOT EXISTS decisions_updated_at AFTER UPDATE ON decisions BEGIN
    UPDATE decisions SET updated_at=datetime('now') WHERE id=new.id;
END;
```

---

## 5. Authentication

### 5.1 Strategy
- JWT Bearer tokens
- Single user (initially). Username/password stored in `users` table, password hashed with `bcrypt`
- Token expiry configured via `ACCESS_TOKEN_EXPIRE_MINUTES`
- All routes except `POST /auth/token` and `GET /health` require a valid token
- Use FastAPI's `Depends(get_current_user)` pattern on a reusable dependency

### 5.2 `routers/auth.py` Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/token` | Login. Returns `{access_token, token_type}` |
| `POST` | `/auth/setup` | First-run only: create the initial user. Disabled once a user exists. |
| `GET` | `/auth/me` | Returns current user info |

### 5.3 `schemas/auth.py`

```python
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: str | None = None

class UserCreate(BaseModel):
    username: str
    password: str = Field(min_length=8)

class UserOut(BaseModel):
    id: int
    username: str
    created_at: str
```

---

## 6. Schemas (Pydantic v2)

Each domain has its own schema file under `schemas/`. Follow this pattern for every domain:

```
{Domain}Base     — shared fields
{Domain}Create   — fields required on POST (no id, no timestamps)
{Domain}Update   — all fields Optional for PATCH
{Domain}Out      — full response including id and timestamps
{Domain}List     — paginated list wrapper
```

### 6.1 `schemas/goals.py`

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class GoalStatus(str, Enum):
    pending = "pending"
    active = "active"
    paused = "paused"
    completed = "completed"
    archived = "archived"

class GoalStage(str, Enum):
    planning = "planning"
    research = "research"
    prototyping = "prototyping"
    development = "development"
    review = "review"
    done = "done"

class GoalBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    status: GoalStatus = GoalStatus.pending
    stage: GoalStage = GoalStage.planning
    priority: int = Field(default=3, ge=1, le=5)
    due_date: Optional[str] = None   # ISO 8601 date string

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[GoalStatus] = None
    stage: Optional[GoalStage] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    due_date: Optional[str] = None

class GoalOut(GoalBase):
    id: int
    created_at: str
    updated_at: str
    task_count: int = 0           # computed: total tasks
    pending_task_count: int = 0   # computed: pending only

    model_config = {"from_attributes": True}

class GoalList(BaseModel):
    items: List[GoalOut]
    total: int
    limit: int
    offset: int
```

### 6.2 `schemas/tasks.py`

```python
class TaskStatus(str, Enum):
    pending = "pending"
    active = "active"
    completed = "completed"
    blocked = "blocked"
    cancelled = "cancelled"

class TaskBase(BaseModel):
    goal_id: int
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.pending
    priority: int = Field(default=3, ge=1, le=5)
    sort_order: int = 0
    due_date: Optional[str] = None

class TaskCreate(TaskBase):
    dependency_ids: List[int] = []   # task IDs this task depends on

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    sort_order: Optional[int] = None
    due_date: Optional[str] = None
    dependency_ids: Optional[List[int]] = None

class TaskOut(TaskBase):
    id: int
    created_at: str
    updated_at: str
    dependency_ids: List[int] = []
    is_blocked: bool = False    # computed: any dependency not completed

    model_config = {"from_attributes": True}

class TaskList(BaseModel):
    items: List[TaskOut]
    total: int
    limit: int
    offset: int
```

### 6.3 `schemas/resources.py`

```python
class ResourceType(str, Enum):
    link = "link"
    file = "file"
    note = "note"
    contact = "contact"

class ResourceBase(BaseModel):
    type: ResourceType
    title: str = Field(min_length=1, max_length=200)
    value: str = Field(min_length=1)
    goal_id: Optional[int] = None
    task_id: Optional[int] = None

    @model_validator(mode='after')
    def must_have_parent(self):
        if self.goal_id is None and self.task_id is None:
            raise ValueError("Resource must be attached to a goal or a task")
        return self

class ResourceCreate(ResourceBase):
    pass

class ResourceUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    value: Optional[str] = None

class ResourceOut(ResourceBase):
    id: int
    created_at: str

    model_config = {"from_attributes": True}
```

### 6.4 `schemas/memories.py`

```python
class MemoryCategory(str, Enum):
    general = "general"
    learning = "learning"
    decision = "decision"
    insight = "insight"
    reference = "reference"

class MemoryBase(BaseModel):
    content: str = Field(min_length=1)
    category: MemoryCategory = MemoryCategory.general
    tags: List[str] = []
    goal_id: Optional[int] = None

class MemoryCreate(MemoryBase):
    pass

class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    category: Optional[MemoryCategory] = None
    tags: Optional[List[str]] = None
    goal_id: Optional[int] = None

class MemoryOut(MemoryBase):
    id: int
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

class MemoryList(BaseModel):
    items: List[MemoryOut]
    total: int
    limit: int
    offset: int
```

### 6.5 `schemas/decisions.py`

```python
class DecisionStatus(str, Enum):
    active = "active"
    revisit = "revisit"
    superseded = "superseded"

class DecisionBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    context: str = Field(min_length=1)
    decision: str = Field(min_length=1)
    rationale: Optional[str] = None
    alternatives: List[str] = []
    goal_id: Optional[int] = None
    status: DecisionStatus = DecisionStatus.active

class DecisionCreate(DecisionBase):
    pass

class DecisionUpdate(BaseModel):
    title: Optional[str] = None
    context: Optional[str] = None
    decision: Optional[str] = None
    rationale: Optional[str] = None
    alternatives: Optional[List[str]] = None
    status: Optional[DecisionStatus] = None

class DecisionOut(DecisionBase):
    id: int
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
```

### 6.6 `schemas/briefing.py`

```python
class BriefingOut(BaseModel):
    id: int
    content: str
    model_used: str
    created_at: str

class BriefingList(BaseModel):
    items: List[BriefingOut]
    total: int
    limit: int
    offset: int
```

---

## 7. Services

### 7.1 `services/llm.py` — LLM Abstraction Layer

This is the only file that knows the LLM provider exists.

**Interface contract:**

```python
class LLMResponse(BaseModel):
    content: str
    model: str
    success: bool
    error: Optional[str] = None

async def generate(prompt: str, system: str = "") -> LLMResponse:
    ...
```

**Requirements:**
- Uses `httpx.AsyncClient` with timeout from `settings.llm_timeout_seconds`
- Retries up to `settings.llm_max_retries` times on transient errors (5xx, timeout) with exponential backoff
- On final failure, returns `LLMResponse(success=False, error="...", content="", model="")` — **never raises**
- Callers must check `response.success` before using `response.content`
- Provider is selected from `settings.llm_provider`. Currently implement Gemini only. Leave a clear `# TODO: add openai provider here` stub.

**Gemini implementation:**
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- Auth: API key as query param `?key={settings.gemini_api_key}`
- Use `httpx.AsyncClient` inside an `asyncio.timeout()` context

### 7.2 `services/goal_service.py`

Provide these async functions (all take a db connection as first arg):

```python
async def get_goals(db, status=None, stage=None, limit=20, offset=0) -> GoalList
async def get_goal(db, goal_id: int) -> GoalOut | None
async def create_goal(db, data: GoalCreate) -> GoalOut
async def update_goal(db, goal_id: int, data: GoalUpdate) -> GoalOut | None
async def archive_goal(db, goal_id: int) -> GoalOut | None   # sets status='archived'
async def delete_goal(db, goal_id: int) -> bool
```

`get_goals` and `get_goal` must include computed fields `task_count` and `pending_task_count` via a JOIN or subquery.

### 7.3 `services/task_service.py`

```python
async def get_tasks(db, goal_id=None, status=None, limit=20, offset=0) -> TaskList
async def get_task(db, task_id: int) -> TaskOut | None
async def create_task(db, data: TaskCreate) -> TaskOut
async def update_task(db, task_id: int, data: TaskUpdate) -> TaskOut | None
async def delete_task(db, task_id: int) -> bool
async def reorder_tasks(db, goal_id: int, ordered_ids: List[int]) -> bool
async def get_blocked_tasks(db) -> List[TaskOut]   # tasks with unmet dependencies
```

**Cycle detection (CRITICAL):**

`create_task` and `update_task` must call `_detect_dependency_cycle()` before committing. Use iterative DFS on the `task_dependencies` table. If a cycle is detected, raise `HTTPException(400, "Circular dependency detected")` before writing anything.

```python
async def _detect_dependency_cycle(db, task_id: int, new_dep_ids: List[int]) -> bool:
    """Returns True if adding new_dep_ids to task_id would create a cycle."""
    # Build adjacency list from task_dependencies
    # Run DFS from each new_dep_id, check if task_id is reachable
    ...
```

### 7.4 `services/memory_service.py`

```python
async def get_memories(db, category=None, goal_id=None, limit=20, offset=0) -> MemoryList
async def get_memory(db, memory_id: int) -> MemoryOut | None
async def create_memory(db, data: MemoryCreate) -> MemoryOut
async def update_memory(db, memory_id: int, data: MemoryUpdate) -> MemoryOut | None
async def delete_memory(db, memory_id: int) -> bool
async def search_memories(db, query: str, limit=10) -> List[MemoryOut]  # uses FTS5
```

Tags are stored as JSON text in the DB. Serialize/deserialize `List[str]` ↔ JSON string transparently in the service layer. The router and schema layers always see `List[str]`.

### 7.5 `services/decision_service.py`

```python
async def get_decisions(db, status=None, goal_id=None, limit=20, offset=0) -> DecisionList  
async def get_decision(db, decision_id: int) -> DecisionOut | None
async def create_decision(db, data: DecisionCreate) -> DecisionOut
async def update_decision(db, decision_id: int, data: DecisionUpdate) -> DecisionOut | None
async def flag_for_revisit(db, decision_id: int) -> DecisionOut | None  # sets status='revisit'
async def delete_decision(db, decision_id: int) -> bool
```

`alternatives` stored as JSON text, same pattern as memory tags.

### 7.6 `services/briefing_service.py`

```python
async def generate_briefing(db) -> BriefingOut
async def get_briefing_history(db, limit=20, offset=0) -> BriefingList
async def get_latest_briefing(db) -> BriefingOut | None
```

**`generate_briefing` logic:**
1. Query: all active goals with their pending task counts
2. Query: tasks with `status='blocked'`
3. Query: last 5 memories ordered by `created_at DESC`
4. Query: decisions with `status='revisit'`
5. Build a structured prompt from this context (see Prompt Template below)
6. Call `llm.generate(prompt)`
7. If `success=False`: return the last stored briefing, or a static fallback string — never raise
8. Compute SHA256 hash of the context (not the response) for deduplication
9. Store result in `briefings` table
10. Broadcast `{"type": "briefing_ready", "id": new_id}` via SSE manager
11. Return `BriefingOut`

**Briefing Prompt Template:**
```
You are Governor, a personal mission control system. Generate a concise morning briefing.

ACTIVE GOALS:
{goals_summary}

BLOCKED TASKS:
{blocked_tasks}

RECENT INSIGHTS:
{recent_memories}

DECISIONS NEEDING REVIEW:
{revisit_decisions}

Generate a structured briefing with: 
1. Priority focus for today (1-3 items max)
2. Blockers that need attention
3. Any patterns or insights from recent memories
4. Decisions flagged for revisit

Be direct. No fluff. Under 400 words.
```

### 7.7 `services/sse_manager.py`

Manages active SSE client connections.

```python
class SSEManager:
    def __init__(self):
        self._clients: dict[str, asyncio.Queue] = {}

    async def connect(self, client_id: str) -> asyncio.Queue:
        """Register a new client, return their queue."""

    async def disconnect(self, client_id: str):
        """Remove client from registry."""

    async def broadcast(self, event: dict):
        """Send event to all connected clients."""

    async def send_to(self, client_id: str, event: dict):
        """Send event to one client."""

sse_manager = SSEManager()  # singleton, imported by routers
```

### 7.8 `services/scheduler.py`

Uses `APScheduler` with `SQLiteJobStore` pointing at a separate `scheduler.db` (not the main DB) so job state survives restarts.

**Scheduled jobs:**
1. **Daily Briefing** — `cron` trigger, runs at 07:00 local time, calls `briefing_service.generate_briefing()`
2. **Blocker Check** — `interval` trigger, every 30 minutes, calls `task_service.get_blocked_tasks()`, broadcasts SSE event if any tasks are newly blocked

Scheduler must start inside FastAPI's `lifespan` context (not `@app.on_event` which is deprecated):

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler.start()
    yield
    scheduler.shutdown()
```

---

## 8. API Endpoints

All routes require `Authorization: Bearer {token}` except `/auth/token`, `/auth/setup`, and `/health`.

All list endpoints support `?limit=` (default 20, max 100) and `?offset=` (default 0).

All PATCH endpoints use partial update — only provided fields are updated. A field set to `null` explicitly clears the value (where nullable). An absent field is ignored.

All endpoints return appropriate HTTP status codes:
- `200` — successful GET/PATCH
- `201` — successful POST
- `204` — successful DELETE (no body)
- `400` — validation error or business rule violation
- `401` — missing or invalid token
- `404` — resource not found
- `409` — conflict (e.g., duplicate username)
- `500` — unexpected server error (log it, return generic message)

### 8.1 System

| Method | Path | Response | Description |
|---|---|---|---|
| `GET` | `/health` | `{status, db, version, uptime}` | Liveness check. Pings DB. No auth required. |
| `GET` | `/export` | JSON file download | Full data export: all tables as JSON |
| `POST` | `/import` | `{imported, skipped, errors}` | Restore from export JSON. Validates before writing. |
| `GET` | `/search` | `{results: [{entity_type, entity_id, title, snippet}]}` | FTS5 search across goals, tasks, memories, decisions |

`/search` params: `?q={query}&types=goal,task,memory,decision&limit=20`

### 8.2 Goals

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| `GET` | `/goals` | — | `GoalList` | List goals. Filter: `?status=&stage=` |
| `POST` | `/goals` | `GoalCreate` | `GoalOut` 201 | Create goal |
| `GET` | `/goals/{id}` | — | `GoalOut` | Get single goal |
| `PATCH` | `/goals/{id}` | `GoalUpdate` | `GoalOut` | Partial update |
| `DELETE` | `/goals/{id}` | — | 204 | Delete (cascades to tasks, resources) |
| `POST` | `/goals/{id}/archive` | — | `GoalOut` | Set status=archived |

### 8.3 Tasks

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| `GET` | `/tasks` | — | `TaskList` | List tasks. Filter: `?goal_id=&status=` |
| `POST` | `/tasks` | `TaskCreate` | `TaskOut` 201 | Create task (runs cycle detection) |
| `GET` | `/tasks/{id}` | — | `TaskOut` | Get single task |
| `PATCH` | `/tasks/{id}` | `TaskUpdate` | `TaskOut` | Partial update (runs cycle detection if deps change) |
| `DELETE` | `/tasks/{id}` | — | 204 | Delete |
| `PATCH` | `/tasks/reorder` | `{goal_id, ordered_ids: [int]}` | 200 | Update sort_order for a goal's tasks |
| `GET` | `/tasks/blocked` | — | `List[TaskOut]` | All tasks with unmet dependencies |

### 8.4 Resources

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| `GET` | `/resources` | — | `List[ResourceOut]` | Filter: `?goal_id=&task_id=&type=` |
| `POST` | `/resources` | `ResourceCreate` | `ResourceOut` 201 | Attach resource |
| `GET` | `/resources/{id}` | — | `ResourceOut` | Get single resource |
| `PATCH` | `/resources/{id}` | `ResourceUpdate` | `ResourceOut` | Update title/value |
| `DELETE` | `/resources/{id}` | — | 204 | Delete |

### 8.5 Memories

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| `GET` | `/memories` | — | `MemoryList` | Filter: `?category=&goal_id=` |
| `POST` | `/memories` | `MemoryCreate` | `MemoryOut` 201 | Create memory |
| `GET` | `/memories/{id}` | — | `MemoryOut` | Get memory |
| `PATCH` | `/memories/{id}` | `MemoryUpdate` | `MemoryOut` | Update |
| `DELETE` | `/memories/{id}` | — | 204 | Delete |
| `GET` | `/memories/search` | — | `List[MemoryOut]` | FTS search. `?q=` required |

### 8.6 Decisions

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| `GET` | `/decisions` | — | `List[DecisionOut]` | Filter: `?status=&goal_id=` |
| `POST` | `/decisions` | `DecisionCreate` | `DecisionOut` 201 | Log decision |
| `GET` | `/decisions/{id}` | — | `DecisionOut` | Get decision |
| `PATCH` | `/decisions/{id}` | `DecisionUpdate` | `DecisionOut` | Update |
| `DELETE` | `/decisions/{id}` | — | 204 | Delete |
| `POST` | `/decisions/{id}/revisit` | — | `DecisionOut` | Flag for review (status=revisit) |

### 8.7 Briefing

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| `GET` | `/briefing` | — | `BriefingOut` | Get latest briefing (generate if none today) |
| `POST` | `/briefing/generate` | — | `BriefingOut` | Force-generate new briefing now |
| `GET` | `/briefing/history` | — | `BriefingList` | Past briefings, newest first |

### 8.8 Events (SSE)

| Method | Path | Description |
|---|---|---|
| `GET` | `/events` | SSE stream. Client connects, receives events until disconnect |

**SSE Event types:**
```json
{"type": "goal_updated",    "id": 1}
{"type": "task_updated",    "id": 5}
{"type": "task_blocked",    "id": 5, "blocked_by": [3, 4]}
{"type": "briefing_ready",  "id": 12}
{"type": "ping"}
```

Server sends `ping` every 15 seconds to keep connections alive.

**SSE disconnect handling (CRITICAL):**
The stream generator must poll `await request.is_disconnected()` on every iteration. On disconnect, call `sse_manager.disconnect(client_id)` before returning. Use `try/finally` to ensure cleanup on cancellation.

```python
@router.get("/events")
async def event_stream(request: Request, current_user=Depends(get_current_user)):
    client_id = str(uuid.uuid4())
    queue = await sse_manager.connect(client_id)
    
    async def generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'ping'})}\n\n"
        finally:
            await sse_manager.disconnect(client_id)
    
    return StreamingResponse(generator(), media_type="text/event-stream")
```

---

## 9. `main.py`

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from database import init_db
from services.scheduler import scheduler
from routers import auth, goals, tasks, resources, memories, decisions, briefing, events

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(
    title="Governor",
    description="Personal Mission Control",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,   # hide docs in production
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,      prefix="/auth",      tags=["auth"])
app.include_router(goals.router,     prefix="/goals",     tags=["goals"])
app.include_router(tasks.router,     prefix="/tasks",     tags=["tasks"])
app.include_router(resources.router, prefix="/resources", tags=["resources"])
app.include_router(memories.router,  prefix="/memories",  tags=["memories"])
app.include_router(decisions.router, prefix="/decisions", tags=["decisions"])
app.include_router(briefing.router,  prefix="/briefing",  tags=["briefing"])
app.include_router(events.router,    tags=["events"])

# Health (no prefix, no auth)
@app.get("/health", tags=["system"])
async def health():
    ...

# Static dashboard files
app.mount("/", StaticFiles(directory="dashboard", html=True), name="dashboard")
```

---

## 10. Frontend (`dashboard/`)

### 10.1 `dashboard/index.html`

Single-page app shell. Alpine.js loaded from CDN. No build step.

**Views (tabs):**
1. **Mission Control** — overview: active goals, today's briefing, blocked tasks count
2. **Goals** — full goal list with status badges, stage indicators, filter by status/stage
3. **Tasks** — task board per goal, drag-handle reordering, dependency indicators
4. **Memory Bank** — memory list with category filter, search bar, quick-add form
5. **Decision Log** — decisions list with status, flag-for-revisit button
6. **Briefing** — latest briefing rendered as markdown, history list, generate button

**Design requirements:**
- Dark theme, techy aesthetic (CSS variables for all colors)
- Status badges: color-coded (pending=grey, active=blue, paused=yellow, completed=green, archived=dim)
- Priority indicator: 1-5 dot/bar visual
- All forms are inline (no modal dialogs required, but acceptable)
- SSE connection established on page load; banner shows "Live" or "Reconnecting..."

### 10.2 `dashboard/app.js`

**Alpine.js store:**

```javascript
Alpine.store('governor', {
    token: localStorage.getItem('gov_token'),
    currentView: 'mission_control',
    goals: [],
    tasks: [],
    memories: [],
    decisions: [],
    briefing: null,
    blockedTasks: [],
    sseConnected: false,

    async init() { ... },
    async fetchAll() { ... },
    setView(view) { this.currentView = view; },

    // Auth
    async login(username, password) { ... },
    logout() { ... },

    // API helpers
    async api(method, path, body=null) {
        // Attaches Bearer token, handles 401 (redirect to login), returns parsed JSON
    },

    // SSE
    connectSSE() {
        // EventSource with reconnect on error
        // On event: update relevant store slice, don't refetch everything
    },
})
```

**SSE reconnection:** If the `EventSource` fires `onerror`, wait 3 seconds and reconnect. Update `sseConnected` flag accordingly.

**Optimistic locking on PATCH:** When updating a goal or task, include the `updated_at` timestamp in a custom header `X-Expected-Version`. The server compares against the DB value and returns `409` if they differ. Frontend shows an inline "This item was updated elsewhere — reload?" message.

---

## 11. `requirements.txt`

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
pydantic-settings>=2.3.0
aiosqlite>=0.20.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
httpx>=0.27.0
APScheduler>=3.10.0
google-generativeai>=0.7.0
python-multipart>=0.0.9
```

---

## 12. Startup & Running

```bash
# First run
cp .env.example .env
# Edit .env — set SECRET_KEY, GEMINI_API_KEY

pip install -r requirements.txt

# Start server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# First-run: create user (endpoint auto-disables after first user created)
curl -X POST http://localhost:8000/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username": "tom", "password": "your_password"}'

# Dashboard opens at:
# http://localhost:8000
```

---

## 13. Error Handling Conventions

| Scenario | Behaviour |
|---|---|
| LLM provider down | Return last briefing. Log warning. Never 500. |
| DB query fails | Log full traceback. Return 500 with `{"detail": "Internal error"}`. Never expose SQL. |
| Missing `.env` field | Crash at startup with clear `ValidationError` message listing missing fields. |
| Circular dependency | Return `400 {"detail": "Circular dependency detected between tasks"}` |
| Stale update (optimistic lock) | Return `409 {"detail": "Resource was modified. Reload and retry."}` |
| SSE client disconnects | Cleanup silently. No error logged. |
| Import file invalid | Return `400` with per-record error list. Entire import is rolled back on any error. |

---

## 14. Security Checklist

- [ ] JWT tokens expire (configured via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- [ ] Passwords hashed with bcrypt (never stored plain)
- [ ] CORS locked to `settings.allowed_origins` (no wildcard)
- [ ] `/docs` disabled unless `DEBUG=true`
- [ ] `/auth/setup` endpoint disabled once one user exists
- [ ] SQL queries use parameterised statements only (no string interpolation)
- [ ] `.env` in `.gitignore`
- [ ] LLM API key never logged or returned in responses
- [ ] Export endpoint requires auth

---

## 15. What This Spec Does Not Cover (Future Work)

- Multi-user support / per-user data isolation
- File upload storage for `resource.type='file'`  
- OpenAI / Anthropic provider implementations in `llm.py` (stub is present)
- Visual timeline / Gantt view
- Inter-goal dependency tracking (currently only task-level)
- Mobile-responsive CSS
- HTTPS / TLS termination (use a reverse proxy like Caddy if needed)
