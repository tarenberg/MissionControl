# Project Dashboard Design Spec

## Layout Overview
- **Header**: Active Goal Status & System Health (GitHub auth, etc.)
- **Sidebar**: Quick navigation between "Active Projects", "Memories/Brain", and "Tools".
- **Main View**: A grid of cards for active goals.
- **Card Detail**: Progress bars for subtasks, weight indicators, and recent "Memory" snippets related to that goal.

## Tech Stack
- **Backend**: PHP (XAMPP 8080) reading `BRAIN/*.json` via `api.php`.
- **Frontend**: Alpine.js for reactivity, Tailwind CSS (via CDN) for styling.
- **Security**: The PHP backend will use the `fs_wrapper` logic to ensure it only reads from the `BRAIN` directory.

## UI Components (Alpine.js)
1.  **`goal-list`**: Fetches `goals.json` and renders cards.
2.  **`system-status`**: Pings a PHP endpoint to check CLI status (GH, Web Fetch).
3.  **`memory-stream`**: Shows the last 5 facts from `memories.json`.

## Wireframe Sketch
```
+-----------------------------------------------------------+
| [Q] Proto-Qwestor Dashboard          [GH: OK] [Web: OK]   |
+-----------+-----------------------------------------------+
| Goals     |  Goal: Build Dashboard [|||||||---] 70%       |
| Memories  |  > Task: Implement Endpoints [Pending]        |
| Tools     |  > Task: Design UI [In Progress]              |
| Settings  +-----------------------------------------------+
|           |  Goal: GitHub MCP [||||||||||] 100%           |
|           |  > Task: Complete!                            |
+-----------+-----------------------------------------------+
```
