/**
 * GitHub Webhook Handler
 * Processes GitHub webhook events and updates tasks accordingly
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WebhookPayload {
  action: string;
  issue?: {
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    html_url: string;
  };
  pull_request?: {
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    html_url: string;
    merged: boolean;
    merged_at: string | null;
  };
  repository: {
    owner: { login: string };
    name: string;
  };
}

export class WebhookHandler {
  /**
   * Verify GitHub webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  /**
   * Handle GitHub webhook event
   */
  async handleWebhook(
    eventType: string,
    payload: WebhookPayload,
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (eventType) {
        case 'issues':
          return await this.handleIssueEvent(payload, projectId);
        case 'pull_request':
          return await this.handlePullRequestEvent(payload, projectId);
        default:
          return { success: true, message: `Event type ${eventType} ignored` };
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      return { success: false, message: String(error) };
    }
  }

  /**
   * Handle issue events (opened, closed, etc.)
   */
  private async handleIssueEvent(
    payload: WebhookPayload,
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    const { action, issue } = payload;

    if (!issue) {
      return { success: false, message: 'No issue in payload' };
    }

    switch (action) {
      case 'opened':
        return await this.handleIssueOpened(issue, projectId);
      case 'closed':
        return await this.handleIssueClosed(issue, projectId);
      case 'reopened':
        return await this.handleIssueReopened(issue, projectId);
      default:
        return { success: true, message: `Issue action ${action} ignored` };
    }
  }

  /**
   * Handle issue opened - create new task
   */
  private async handleIssueOpened(
    issue: WebhookPayload['issue'],
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    if (!issue) return { success: false, message: 'No issue data' };

    // Check if task already exists (idempotency)
    const existingTask = await prisma.task.findFirst({
      where: {
        projectId,
        githubIssueNumber: issue.number,
      },
    });

    if (existingTask) {
      return { success: true, message: `Task already exists for issue #${issue.number}` };
    }

    // Create new task
    await prisma.task.create({
      data: {
        id: `task-gh-${issue.number}-${projectId.slice(0, 8)}`,
        title: issue.title,
        description: issue.body || undefined,
        status: 'Backlog',
        projectId,
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.html_url,
        githubStatus: 'open',
      },
    });

    // Log webhook event
    await this.logWebhookEvent(projectId, 'issue_opened', 'success', `Created task for issue #${issue.number}`);

    return { success: true, message: `Created task for issue #${issue.number}` };
  }

  /**
   * Handle issue closed - mark task as done
   */
  private async handleIssueClosed(
    issue: WebhookPayload['issue'],
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    if (!issue) return { success: false, message: 'No issue data' };

    const task = await prisma.task.findFirst({
      where: {
        projectId,
        githubIssueNumber: issue.number,
      },
    });

    if (!task) {
      return { success: true, message: `No task found for issue #${issue.number}` };
    }

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'Done',
        githubStatus: 'closed',
        updatedAt: new Date(),
      },
    });

    await this.logWebhookEvent(projectId, 'issue_closed', 'success', `Marked task as done for issue #${issue.number}`);

    return { success: true, message: `Marked task as done for issue #${issue.number}` };
  }

  /**
   * Handle issue reopened - reopen task
   */
  private async handleIssueReopened(
    issue: WebhookPayload['issue'],
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    if (!issue) return { success: false, message: 'No issue data' };

    const task = await prisma.task.findFirst({
      where: {
        projectId,
        githubIssueNumber: issue.number,
      },
    });

    if (!task) {
      return { success: true, message: `No task found for issue #${issue.number}` };
    }

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'Backlog',
        githubStatus: 'open',
        updatedAt: new Date(),
      },
    });

    await this.logWebhookEvent(projectId, 'issue_reopened', 'success', `Reopened task for issue #${issue.number}`);

    return { success: true, message: `Reopened task for issue #${issue.number}` };
  }

  /**
   * Handle pull request events
   */
  private async handlePullRequestEvent(
    payload: WebhookPayload,
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    const { action, pull_request } = payload;

    if (!pull_request) {
      return { success: false, message: 'No pull request in payload' };
    }

    switch (action) {
      case 'opened':
        return await this.handlePROpened(pull_request, projectId);
      case 'closed':
        return await this.handlePRClosed(pull_request, projectId);
      default:
        return { success: true, message: `PR action ${action} ignored` };
    }
  }

  /**
   * Handle PR opened - update task to "In Progress"
   */
  private async handlePROpened(
    pr: WebhookPayload['pull_request'],
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    if (!pr) return { success: false, message: 'No PR data' };

    // Try to find related issue by parsing PR body or title
    const issueMatch = pr.body?.match(/#(\d+)/) || pr.title.match(/#(\d+)/);
    
    if (!issueMatch) {
      return { success: true, message: 'No related issue found in PR' };
    }

    const issueNumber = parseInt(issueMatch[1], 10);

    const task = await prisma.task.findFirst({
      where: {
        projectId,
        githubIssueNumber: issueNumber,
      },
    });

    if (!task) {
      return { success: true, message: `No task found for issue #${issueNumber}` };
    }

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'In Progress',
        githubPrNumber: pr.number,
        githubPrUrl: pr.html_url,
        githubStatus: 'pr_open',
        updatedAt: new Date(),
      },
    });

    await this.logWebhookEvent(projectId, 'pr_opened', 'success', `Updated task to In Progress for PR #${pr.number}`);

    return { success: true, message: `Updated task to In Progress for PR #${pr.number}` };
  }

  /**
   * Handle PR closed - update task based on merge status
   */
  private async handlePRClosed(
    pr: WebhookPayload['pull_request'],
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    if (!pr) return { success: false, message: 'No PR data' };

    // Try to find related issue
    const issueMatch = pr.body?.match(/#(\d+)/) || pr.title.match(/#(\d+)/);
    
    if (!issueMatch) {
      return { success: true, message: 'No related issue found in PR' };
    }

    const issueNumber = parseInt(issueMatch[1], 10);

    const task = await prisma.task.findFirst({
      where: {
        projectId,
        githubIssueNumber: issueNumber,
      },
    });

    if (!task) {
      return { success: true, message: `No task found for issue #${issueNumber}` };
    }

    const newStatus = pr.merged ? 'Done' : 'Backlog';
    const githubStatus = pr.merged ? 'merged' : 'pr_closed';

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: newStatus,
        githubStatus,
        updatedAt: new Date(),
      },
    });

    await this.logWebhookEvent(
      projectId,
      'pr_closed',
      'success',
      `Updated task to ${newStatus} for PR #${pr.number} (merged: ${pr.merged})`
    );

    return { 
      success: true, 
      message: `Updated task to ${newStatus} for PR #${pr.number} (merged: ${pr.merged})` 
    };
  }

  /**
   * Log webhook event
   */
  private async logWebhookEvent(
    projectId: string,
    eventType: string,
    status: 'success' | 'error',
    message: string
  ): Promise<void> {
    await prisma.githubSyncLog.create({
      data: {
        projectId,
        syncType: 'webhook',
        status,
        message: `${eventType}: ${message}`,
        itemsProcessed: 1,
      },
    });
  }
}

export const webhookHandler = new WebhookHandler();
