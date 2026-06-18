# GitHub Task Sync - Specification

## Overview
Automatically synchronize GitHub issues and pull requests with Mission Control tasks, eliminating manual task creation and status updates.

## Goals
1. **Auto-create tasks** from GitHub issues when they're opened
2. **Auto-update task status** when PR status changes (opened → In Progress, merged → Done)
3. **Bi-directional sync** - changes in Mission Control can optionally update GitHub
4. **Real-time updates** via GitHub webhooks
5. **Periodic fallback sync** for reliability

## Requirements

### Must Have
- [x] API endpoint to receive GitHub webhooks (`/api/github/webhook`)
- [x] Handler for `issues.opened` event → creates new Task
- [x] Handler for `pull_request.opened` event → updates Task to "In Progress"
- [x] Handler for `pull_request.closed` event → updates Task to "Done" (if merged)
- [x] Background sync service that runs every 30 minutes to catch missed events
- [x] Database schema to store GitHub webhook secrets per repo
- [x] UI component showing last sync status and manual sync trigger

### Should Have
- [ ] Support for issue assignment → assignedTo field
- [ ] Support for issue labels → tags or project categorization
- [ ] GitHub comment sync → task notes/updates
- [ ] Bulk import existing issues from a repo

### Could Have
- [ ] Bi-directional sync (Mission Control → GitHub)
- [ ] GitHub Actions integration for CI/CD status
- [ ] Automatic PR creation from tasks

## Constraints
- Must handle webhook verification (HMAC signature)
- Must be idempotent (same event processed multiple times = same result)
- Must gracefully handle rate limits
- Must work with private repos (using GitHub App or PAT)

## Out of Scope
- GitHub project boards sync
- Multi-repo aggregation UI (v1 focuses on single repo per project)
- GitHub discussions integration

## Success Criteria
1. Opening a GitHub issue automatically creates a task in Mission Control
2. Opening a PR for an issue automatically updates the task to "In Progress"
3. Merging a PR automatically marks the task as "Done"
4. Manual sync button successfully pulls latest state from GitHub
5. Zero duplicate tasks created from webhook retries

## Dependencies
- GitHub API access (using existing `gh` CLI or Octokit)
- Database schema update for webhook secrets
- Cron/interval timer for background sync
