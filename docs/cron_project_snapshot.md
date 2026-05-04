As the Housekeeper agent, your task is to retrieve a snapshot of all current projects and record them in memory.

**Steps:**
1. Read the JSON file located at `C:\Users\tberg\AppData\Local\Temp\cb8f66e9-70be-4d27-a481-13c22ba2eb79\data\projects.json`.
2. Parse the JSON content, which is an array of project objects.
3. For each project object, extract all its key-value pairs (id, title, description, status, importance, progress, lastWorkedOn, lastAgent, sourcePath, createdAt, groups, launchUrl, repoUrl).
4. Format the extracted details for each project into a clear, readable Markdown string. Use a consistent heading for each project (e.g., `### Project: [Project Title]`).
5. Create a top-level heading for the entire snapshot: `## Project Details Snapshot for 2026-03-23`.
6. Append this entire formatted Markdown string as new content to the file `C:\Users\tberg\.openclaw\workspace\memory\2026-03-23.md`. If the file doesn't exist, create it. If it exists, append to the end.
7. Once completed, reply with 'Project snapshot successfully recorded for 2026-03-23.' and then NO_REPLY
