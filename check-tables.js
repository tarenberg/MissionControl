const sqlite3 = require('better-sqlite3');
const db = new sqlite3('./data/mission-control.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(JSON.stringify(tables, null, 2));
db.close();
