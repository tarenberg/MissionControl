/**
 * GitHub Background Sync Script
 * Runs periodically to sync GitHub issues/PRs with Mission Control tasks
 * Usage: node scripts/github-background-sync.js
 */

const { PrismaClient } = require('@prisma/client');
const { Octokit } = require('@octokit/rest');

const prisma = new PrismaClient();

class BackgroundSyncService {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  async syncAllProjects() {
    console.log('\n🔄 Starting GitHub background sync...\n');

    try {
      // Get all projects with GitHub webhook configs
      const webhookConfigs = await prisma.githubWebhookConfig.findMany({
        where: { enabled: true },
        include: { project: true },
      });

      if (webhookConfigs.length === 0) {
        console.log('No projects configured for GitHub sync.');
        return;
      }

      console.log(`Found ${webhookConfigs.length} project(s) to sync.\n`);

      for (const config of webhookConfigs) {
        await this.syncProject(config);
      }

      console.log('\n✅ Background sync complete!\n');
    } catch (error) {
      console.error('❌ Background sync failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  async syncProject(config) {
    const { project, repoOwner, repoName } = config;
    console.log(`📦 Syncing ${project.title} (${repoOwner}/${repoName})...`);

    let tasksCreated = 0;
    let tasksUpdated = 0;
    const errors = [];

    try {
      // Fetch issues from GitHub
      const { data: issues } = await this.octokit.rest.issues.listForRepo({
        owner: repoOwner,
        repo: repoName,
        state: 'all',
        per_page: 100,
      });

      // Filter out PRs (they come through the issues endpoint)
      const actualIssues = issues.filter(issue => !issue.pull_request);

      // Fetch PRs
      const { data: pullRequests } = await this.octokit.rest.pulls.list({
        owner: repoOwner,
        repo: repoName,
        state: 'all',
        per_page: 100,
      });

      console.log(`  Found ${actualIssues.length} issues, ${pullRequests.length} PRs`);

      // Sync each issue
      for (const issue of actualIssues) {
        try {
          const result = await this.syncIssue(project.id, issue, pullRequests);
          if (result.created) tasksCreated++;
          if (result.updated) tasksUpdated++;
        } catch (error) {
          errors.push(`Issue #${issue.number}: ${error.message}`);
        }
      }

      // Log sync result
      await prisma.githubSyncLog.create({
        data: {
          projectId: project.id,
          syncType: 'scheduled',
          status: errors.length === 0 ? 'success' : 'error',
          message: errors.length > 0 ? errors.join('; ') : undefined,
          itemsProcessed: actualIssues.length,
        },
      });

      console.log(`  ✅ Created: ${tasksCreated}, Updated: ${tasksUpdated}`);
      if (errors.length > 0) {
        console.log(`  ⚠️ Errors: ${errors.length}`);
      }
    } catch (error) {
      console.error(`  ❌ Sync failed:`, error.message);

      await prisma.githubSyncLog.create({
        data: {
          projectId: project.id,
          syncType: 'scheduled',
          status: 'error',
          message: error.message,
          itemsProcessed: 0,
        },
      });
    }
  }

  async syncIssue(projectId, issue, pullRequests) {
    // Find related PR
    const relatedPR = pullRequests.find(pr => 
      pr.body?.includes(`#${issue.number}`) || 
      pr.title.includes(`#${issue.number}`)
    );

    // Determine task status
    let status = 'Backlog';
    let githubStatus = issue.state;

    if (relatedPR) {
      if (relatedPR.merged_at) {
        status = 'Done';
        githubStatus = 'merged';
      } else if (relatedPR.state === 'open') {
        status = 'In Progress';
        githubStatus = 'pr_open';
      } else if (relatedPR.state === 'closed') {
        status = 'Backlog';
        githubStatus = 'pr_closed';
      }
    } else if (issue.state === 'closed') {
      status = 'Done';
      githubStatus = 'closed';
    }

    const taskData = {
      title: issue.title,
      description: issue.body || undefined,
      status,
      projectId,
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.html_url,
      githubPrNumber: relatedPR?.number,
      githubPrUrl: relatedPR?.html_url,
      githubStatus,
      updatedAt: new Date(),
    };

    // Check if task exists
    const existingTask = await prisma.task.findFirst({
      where: {
        projectId,
        githubIssueNumber: issue.number,
      },
    });

    if (existingTask) {
      // Update existing task
      await prisma.task.update({
        where: { id: existingTask.id },
        data: taskData,
      });
      return { created: false, updated: true };
    } else {
      // Create new task
      await prisma.task.create({
        data: {
          ...taskData,
          id: `task-gh-${issue.number}-${projectId.slice(0, 8)}`,
        },
      });
      return { created: true, updated: false };
    }
  }
}

// Run the sync
const syncService = new BackgroundSyncService();
syncService.syncAllProjects();
