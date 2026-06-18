const sqlite3 = require('better-sqlite3');
const db = new sqlite3('./data/mission-control.db');
const tasks = db.prepare(`
  SELECT id, title, description, status, assignedTo, projectId, createdAt 
  FROM Task 
  WHERE status IN ('Backlog', 'In Progress') 
  ORDER BY createdAt DESC 
  LIMIT 20
`).all();
console.log(JSON.stringify(tasks, null, 2));
db.close();
