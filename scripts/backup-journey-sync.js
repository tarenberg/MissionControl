#!/usr/bin/env node
/**
 * Backup Journey Sync entries to Google Drive
 * Usage: node scripts/backup-journey-sync.js
 * Scheduled: Nightly via cron
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.JOURNEY_SYNC_URL || 'http://localhost:3002';
const BACKUP_DIR = 'G:\\My Drive\\Chronicles';
const TIMESTAMP = new Date().toISOString().split('T')[0];
const BACKUP_FILE = path.join(BACKUP_DIR, `journey-sync-backup-${TIMESTAMP}.json`);

async function fetchEntries() {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}/api/entries?skip=0&take=10000`;
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        return reject(new Error(`API returned ${res.statusCode}`));
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.entries || []);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log(`[Journey Sync Backup] Starting backup to ${BACKUP_DIR}`);

  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      console.error(`ERROR: Backup directory not found: ${BACKUP_DIR}`);
      console.error('Please ensure G:\\My Drive\\Chronicles exists');
      process.exit(1);
    }

    // Fetch all entries
    console.log('Fetching entries from backend...');
    const entries = await fetchEntries();

    // Create backup object
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      totalEntries: entries.length,
      entries,
    };

    // Write backup file
    console.log(`Writing backup to ${BACKUP_FILE}...`);
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));

    // Cleanup old backups (keep last 30 days)
    console.log('Cleaning up old backups...');
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('journey-sync-backup-') && f.endsWith('.json'));
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    files.forEach(file => {
      const filepath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filepath);
      if (stats.mtime < cutoffDate) {
        console.log(`Deleting old backup: ${file}`);
        fs.unlinkSync(filepath);
      }
    });

    console.log(`✅ Backup successful: ${backup.totalEntries} entries`);
    console.log(`📁 File: ${BACKUP_FILE}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

main();
