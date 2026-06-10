# GitHub Task Sync - Implementation Plan

## Architecture Overview

```
GitHub → Webhook → /api/github/webhook → Event Handler → Database Update
                                                              ↓
                                                         Task Created/Updated
                                                              ↓
                                                         UI Updates (SSE)

Background Service (30min interval) → GitHub API → Fetch Issues/PRs → Sync Database
```

## Database Schema Changes

### New Table: `GithubWebhookConfig`
```sql
CREATE TABLE GithubWebhookConfig (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  repoOwner TEXT NOT NULL,
  repoName TEXT NOT NULL,
  webhookSecret TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES Project(id)
);
```

### Update `Task` table
- `githubIssueNumber` - already exists ✓
- `githubIssueUrl` - already exists ✓
- `githubPrNumber` - already exists ✓
- `githubPrUrl` - already exists ✓
- `githubStatus` - already exists ✓

### New Table: `GithubSyncLog`
```sql
CREATE TABLE GithubSyncLog (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  syncType TEXT NOT NULL, -- 'webhook' | 'manual' | 'scheduled'
  status TEXT NOT NULL, -- 'success' | 'error'
  message TEXT,
  itemsProcessed INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES Project(id)
);
```

## File Structure

```
app/
  api/
    github/
      webhook/
        route.ts          # Webhook receiver endpoint
      sync/
        route.ts          # Manual sync trigger endpoint
lib/
  github/
    webhook-handler.ts    # Process webhook events
    sync-service.ts       # Background sync logic
    github-client.ts      # GitHub API wrapper
components/
  GithubSyncStatus.tsx    # UI widget showing sync status
scripts/
  github-background-sync.js  # Cron job script
```

## Implementation Steps

### Phase 1: Database Setup
1. Create Prisma schema updates
2. Generate migration
3. Run migration on dev database

### Phase 2: Webhook Handler
1. Create `/api/github/webhook/route.ts`
2. Implement HMAC signature verification
3. Route events to appropriate handlers:
   - `issues.opened` → create Task
   - `issues.closed` → mark Task as Done (if issue closed)
   - `pull_request.opened` → update Task to "In Progress"
   - `pull_request.closed` → update Task based on merge status
4. Implement idempotency checks (check if task already exists)

### Phase 3: Background Sync Service
1. Create `lib/github/sync-service.ts`
2. Implement GitHub API client wrapper
3. Fetch all open issues for a repo
4. Compare with existing tasks
5. Create/update tasks as needed
6. Log sync results to `GithubSyncLog`

### Phase 4: API Endpoints
1. Create `/api/github/sync/route.ts` for manual sync triggers
2. Add authentication/authorization
3. Return sync status and results

### Phase 5: UI Component
1. Create `GithubSyncStatus.tsx` component
2. Show last sync time, status, items processed
3. Add manual sync button
4. Display in real-time using SSE or polling

### Phase 6: Cron Setup
1. Create `scripts/github-background-sync.js`
2. Add to crontab or Windows Task Scheduler
3. Run every 30 minutes

## Risk Mitigation

1. **Webhook Failures**: Background sync ensures we don't miss events
2. **Rate Limits**: Implement exponential backoff, cache responses
3. **Duplicate Tasks**: Use `githubIssueNumber` as unique constraint
4. **Stale Data**: Timestamp checks ensure we always use latest data

## Testing Strategy

1. **Unit Tests**: Test webhook signature verification
2. **Integration Tests**: Mock GitHub webhook payloads
3. **Manual Testing**: 
   - Create an issue on GitHub → verify task created
   - Open a PR → verify task updated
   - Merge PR → verify task marked Done

## Rollout Plan

1. Deploy to dev environment
2. Configure webhook on test repo
3. Test all event types
4. Deploy to production
5. Configure webhooks on production repos
6. Monitor logs for errors
