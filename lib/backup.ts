import { writeFile, readdir, readFile } from 'fs/promises';
import { join } from 'path';

const BACKUP_DIR = join(process.cwd(), 'backups', 'journal');

interface BackupEntry {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  location: string | null;
  weather: string | null;
  createdAt: string;
  updatedAt: string;
  media?: any[];
}

/**
 * Save a journal entry to disk as a backup
 * Format: YYYY-MM-DD_HH-mm-ss_<entryId>.json
 */
export async function backupEntry(entry: BackupEntry): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${timestamp}_${entry.id}.json`;
    const filepath = join(BACKUP_DIR, filename);
    
    await writeFile(filepath, JSON.stringify(entry, null, 2), 'utf-8');
    console.log(`✅ Backed up journal entry: ${filename}`);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    // Don't throw — backup failures shouldn't break the main operation
  }
}

/**
 * Record a deletion event (tombstone file)
 */
export async function backupDeletion(entryId: string, deletedEntry: BackupEntry): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${timestamp}_DELETED_${entryId}.json`;
    const filepath = join(BACKUP_DIR, filename);
    
    await writeFile(filepath, JSON.stringify(deletedEntry, null, 2), 'utf-8');
    console.log(`🗑️ Logged deletion: ${filename}`);
  } catch (error) {
    console.error('❌ Deletion log failed:', error);
  }
}

/**
 * List all backups sorted by date (newest first)
 */
export async function listBackups(): Promise<string[]> {
  try {
    const files = await readdir(BACKUP_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse(); // newest first
  } catch (error) {
    console.error('❌ Failed to list backups:', error);
    return [];
  }
}

/**
 * Load a specific backup file
 */
export async function loadBackup(filename: string): Promise<BackupEntry | null> {
  try {
    const filepath = join(BACKUP_DIR, filename);
    const content = await readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to load backup ${filename}:`, error);
    return null;
  }
}

/**
 * Export all current entries as a single timestamped snapshot
 */
export async function createSnapshot(entries: BackupEntry[]): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `SNAPSHOT_${timestamp}.json`;
    const filepath = join(BACKUP_DIR, filename);
    
    await writeFile(filepath, JSON.stringify(entries, null, 2), 'utf-8');
    console.log(`📸 Created snapshot: ${filename}`);
    return filename;
  } catch (error) {
    console.error('❌ Snapshot creation failed:', error);
    throw error;
  }
}
