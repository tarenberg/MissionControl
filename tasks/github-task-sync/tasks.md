# GitHub Task Sync - Task Breakdown

## Phase 1: Database Schema
- [ ] 1.1: Add `GithubWebhookConfig` table to Prisma schema
- [ ] 1.2: Add `GithubSyncLog` table to Prisma schema
- [ ] 1.3: Generate and run migration
- [ ] 1.4: Verify schema changes in database

## Phase 2: Core GitHub Client
- [ ] 2.1: Create `lib/github/github-client.ts` with Octokit wrapper
- [ ] 2.2: Implement `fetchIssues(owner, repo)` method
- [ ] 2.3: Implement `fetchPullRequests(owner, repo)` method
- [ ] 2.4: Add rate limit handling and retries

## Phase 3: Webhook Handler
- [ ] 3.1: Create `/app/api/github/webhook/route.ts`
- [ ] 3.2: Implement HMAC signature verification
- [ ] 3.3: Add event router (issues, pull_request events)
- [ ] 3.4: Implement `handleIssueOpened` - create Task
- [ ] 3.5: Implement `handlePullRequestOpened` - update Task to "In Progress"
- [ ] 3.6: Implement `handlePullRequestClosed` - update Task based on merge status
- [ ] 3.7: Add idempotency checks (prevent duplicate task creation)
- [ ] 3.8: Add error handling and logging

## Phase 4: Sync Service
- [ ] 4.1: Create `lib/github/sync-service.ts`
- [ ] 4.2: Implement `syncIssuesForProject(projectId)` function
- [ ] 4.3: Add task comparison logic (existing vs GitHub state)
- [ ] 4.4: Implement task creation for new issues
- [ ] 4.5: Implement task updates for changed issues
- [ ] 4.6: Log sync results to `GithubSyncLog`

## Phase 5: Manual Sync API
- [ ] 5.1: Create `/app/api/github/sync/route.ts`
- [ ] 5.2: Add POST endpoint to trigger manual sync
- [ ] 5.3: Return sync progress and results
- [ ] 5.4: Add authentication check

## Phase 6: UI Component
- [ ] 6.1: Create `components/GithubSyncStatus.tsx`
- [ ] 6.2: Display last sync time and status
- [ ] 6.3: Add manual sync button with loading state
- [ ] 6.4: Show items processed count
- [ ] 6.5: Add error display if sync fails
- [ ] 6.6: Integrate into main dashboard

## Phase 7: Background Sync Script
- [ ] 7.1: Create `scripts/github-background-sync.js`
- [ ] 7.2: Load all projects with GitHub repos
- [ ] 7.3: Call sync service for each project
- [ ] 7.4: Add logging and error handling
- [ ] 7.5: Test script manually

## Phase 8: Testing & Documentation
- [ ] 8.1: Test webhook with real GitHub events
- [ ] 8.2: Test manual sync button
- [ ] 8.3: Verify task creation and updates
- [ ] 8.4: Update project README with setup instructions
- [ ] 8.5: Document webhook configuration steps

## Phase 9: Deployment
- [ ] 9.1: Commit all changes
- [ ] 9.2: Create pull request
- [ ] 9.3: Review code
- [ ] 9.4: Merge to main
- [ ] 9.5: Configure GitHub webhook on target repos
