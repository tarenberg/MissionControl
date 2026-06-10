/**
 * GitHub API Client
 * Wrapper around GitHub API for fetching issues and pull requests
 */

import { Octokit } from '@octokit/rest';

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  assignee: { login: string } | null;
  labels: Array<{ name: string }>;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  merged?: boolean;
  merged_at?: string | null;
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(auth?: string) {
    this.octokit = new Octokit({
      auth: auth || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Fetch all issues for a repository
   */
  async fetchIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    try {
      const { data } = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        per_page: 100,
      });

      // Filter out pull requests (GitHub API returns PRs in issues endpoint)
      return data.filter(issue => !issue.pull_request) as GitHubIssue[];
    } catch (error) {
      console.error('Error fetching GitHub issues:', error);
      throw error;
    }
  }

  /**
   * Fetch all pull requests for a repository
   */
  async fetchPullRequests(owner: string, repo: string): Promise<GitHubPullRequest[]> {
    try {
      const { data } = await this.octokit.rest.pulls.list({
        owner,
        repo,
        state: 'all',
        per_page: 100,
      });

      // Map to our interface, explicitly handling merged field
      return data.map(pr => ({
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state as 'open' | 'closed',
        html_url: pr.html_url,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged: pr.merged_at ? true : false,
        merged_at: pr.merged_at,
      }));
    } catch (error) {
      console.error('Error fetching GitHub pull requests:', error);
      throw error;
    }
  }

  /**
   * Fetch a specific issue by number
   */
  async fetchIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    try {
      const { data } = await this.octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });

      return data as GitHubIssue;
    } catch (error) {
      console.error(`Error fetching GitHub issue #${issueNumber}:`, error);
      throw error;
    }
  }

  /**
   * Fetch a specific pull request by number
   */
  async fetchPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest> {
    try {
      const { data } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      return data as GitHubPullRequest;
    } catch (error) {
      console.error(`Error fetching GitHub PR #${prNumber}:`, error);
      throw error;
    }
  }
}
