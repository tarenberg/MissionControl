/**
 * GitHub Sync Service
 * Synchronizes GitHub issues and PRs with Mission Control tasks
 */

import { PrismaClient } from '@prisma/client';
import { GitHubClient, GitHubIssue, GitHubPullRequest } from './github-client';

const prisma = new PrismaClient();

export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  tasksCreated: number;
  tasksUpdated: number;
  errors: string[];
}

export class GitHubSyncService {
  private githubClient: GitHubClient;

  constructor(githubToken?: string) {
    this.githubClient = new GitHubClient(githubToken);
  }

  /**
   * Sync all issues and PRs for a project
   */
  async syncProject(projectId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      itemsProcessed: 0,
      tasksCreated: 0,
      tasksUpdated: 0,
      errors: [],
    };

    try {
      // Get project with GitHub config
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { webhookConfig: true },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (!project.webhookConfig) {
        throw new Error(`Project ${projectId} has no GitHub webhook configuration`);
      }

      const { repoOwner, repoName } = project.webhookConfig;

      // Fetch issues and PRs from GitHub
      const [issues, pullRequests] = await Promise.all([
        this.githubClient.fetchIssues(repoOwner, repoName),
        this.githubClient.fetchPullRequests(repoOwner, repoName),
      ]);

      // Sync issues
      for (const issue of issues) {
        try {
          await this.syncIssue(projectId, issue, pullRequests);
          result.itemsProcessed++;
        } catch (error) {
          result.errors.push(`Issue #${issue.number}: ${error}`);
        }
      }

      // Log sync result
      await prisma.githubSyncLog.create({
        data: {
          projectId,
          syncType: 'scheduled',
          status: result.errors.length === 0 ? 'success' : 'error',
          message: result.errors.length > 0 ? result.errors.join('; ') : undefined,
          itemsProcessed: result.itemsProcessed,
        },
      });

      if (result.errors.length > 0) {
        result.success = false;
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);

      // Log sync error
      await prisma.githubSyncLog.create({
        data: {
          projectId,
          syncType: 'scheduled',
          status: 'error',
          message: String(error),
          itemsProcessed: result.itemsProcessed,
        },
      });

      return result;
    }
  }

  /**
   * Sync a single issue with its related PR
   */
  private async syncIssue(
    projectId: string,
    issue: GitHubIssue,
    pullRequests: GitHubPullRequest[]
  ): Promise<void> {
    // Find related PR (if any)
    const relatedPR = pullRequests.find(pr => 
      pr.body?.includes(`#${issue.number}`) || 
      pr.title.includes(`#${issue.number}`)
    );

    // Check if task already exists
    const existingTask = await prisma.task.findFirst({
      where: {
        projectId,
        githubIssueNumber: issue.number,
      },
    });

    // Determine task status based on issue and PR state
    let status = 'Backlog';
    let githubStatus: string = issue.state;

    if (relatedPR) {
      if (relatedPR.merged) {
        status = 'Done';
        githubStatus = 'merged';
      } else if (relatedPR.state === 'open') {
        status = 'In Progress';
        githubStatus = 'pr_open';
      } else if (relatedPR.state === 'closed' && !relatedPR.merged) {
        status = 'Backlog';
        githubStatus = 'pr_closed';
      }
    } else if (issue.state === 'closed') {
      status = 'Done';
      githubStatus = 'closed';
    } else if (issue.state === 'open') {
      status = 'Backlog';
      githubStatus = 'open';
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

    if (existingTask) {
      // Update existing task
      await prisma.task.update({
        where: { id: existingTask.id },
        data: taskData,
      });
    } else {
      // Create new task
      await prisma.task.create({
        data: {
          ...taskData,
          id: `task-gh-${issue.number}-${projectId.slice(0, 8)}`,
        },
      });
    }
  }

  /**
   * Get sync history for a project
   */
  async getSyncHistory(projectId: string, limit = 10) {
    return prisma.githubSyncLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const githubSyncService = new GitHubSyncService();
