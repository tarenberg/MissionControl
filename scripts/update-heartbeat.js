#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const HEARTBEAT_PATH = path.join('C:/Users/tberg/.openclaw/workspace', 'HEARTBEAT.md');

function updateHeartbeat() {
  const timestamp = new Date().toISOString();
  const content = `HEARTBEAT_OK\nLast updated: ${timestamp}`;

  try {
    fs.writeFileSync(HEARTBEAT_PATH, content, 'utf-8');
    console.log(`[heartbeat] Updated HEARTBEAT.md at ${timestamp}`);
  } catch (err) {
    console.error('[heartbeat] Failed to update HEARTBEAT.md', err);
    process.exit(1);
  }
}

updateHeartbeat();
