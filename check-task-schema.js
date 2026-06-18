const sqlite3 = require('better-sqlite3');
const db = new sqlite3('./data/mission-control.db');
const schema = db.prepare("PRAGMA table_info(Task)").all();
console.log(JSON.stringify(schema, null, 2));
db.close();
