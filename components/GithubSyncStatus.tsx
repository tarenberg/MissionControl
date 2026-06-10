'use client';

import { useState, useEffect } from 'react';
import styles from './GithubSyncStatus.module.css';

interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  message: string | null;
  itemsProcessed: number;
  createdAt: number;
}

interface GithubSyncStatusProps {
  projectId: string;
}

export default function GithubSyncStatus({ projectId }: GithubSyncStatusProps) {
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sync history
  useEffect(() => {
    loadSyncHistory();
  }, [projectId]);

  const loadSyncHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/github/sync?projectId=${projectId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load sync history');
      }

      setSyncHistory(data.history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      // Reload history after sync
      await loadSyncHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  const lastSync = syncHistory[0];
  const lastSyncTime = lastSync 
    ? new Date(lastSync.createdAt).toLocaleString() 
    : 'Never';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>GitHub Sync Status</h3>
        <button
          onClick={triggerSync}
          disabled={syncing || loading}
          className={styles.syncButton}
        >
          {syncing ? '🔄 Syncing...' : '🔄 Sync Now'}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          ⚠️ {error}
        </div>
      )}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Last Sync:</span>
          <span className={styles.value}>{lastSyncTime}</span>
        </div>
        {lastSync && (
          <>
            <div className={styles.stat}>
              <span className={styles.label}>Status:</span>
              <span className={`${styles.value} ${styles[lastSync.status]}`}>
                {lastSync.status === 'success' ? '✅' : '❌'} {lastSync.status}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.label}>Items Processed:</span>
              <span className={styles.value}>{lastSync.itemsProcessed}</span>
            </div>
          </>
        )}
      </div>

      {syncHistory.length > 0 && (
        <div className={styles.history}>
          <h4>Recent Syncs</h4>
          <div className={styles.logs}>
            {syncHistory.slice(0, 5).map((log) => (
              <div key={log.id} className={styles.logEntry}>
                <div className={styles.logHeader}>
                  <span className={`${styles.logStatus} ${styles[log.status]}`}>
                    {log.status === 'success' ? '✅' : '❌'}
                  </span>
                  <span className={styles.logType}>{log.syncType}</span>
                  <span className={styles.logTime}>
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                {log.message && (
                  <div className={styles.logMessage}>{log.message}</div>
                )}
                <div className={styles.logItems}>
                  {log.itemsProcessed} item{log.itemsProcessed !== 1 ? 's' : ''} processed
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
