const sqlite3 = require('better-sqlite3');
const db = new sqlite3('./data/mission-control.db');
const tasks = db.prepare(`
  SELECT id, title, description, status, priority, projectId, created_at 
  FROM Task 
  WHERE status IN ('Backlog', 'In Progress') 
  ORDER BY priority DESC, created_at DESC 
  LIMIT 15
`).all();
console.log(JSON.stringify(tasks, null, 2));
db.close();
