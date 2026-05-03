const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function harvestGithubData() {
  console.log('--- Starting GitHub Harvest ---');
  
  const projects = await prisma.project.findMany({
    where: {
      githubUrl: { not: null }
    }
  });

  console.log(`Harvesting data for ${projects.length} projects...`);

  for (const project of projects) {
    try {
      // Extract owner/repo from URL
      const match = project.githubUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
      if (!match) continue;
      const repo = match[1];

      console.log(`[${project.title}] Fetching metadata for ${repo}...`);

      // 1. Fetch Issues
      const issuesOutput = execSync(`gh issue list --repo ${repo} --limit 10 --json number,title,url,state`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      const issues = JSON.parse(issuesOutput);

      // 2. Sync Issues to Tasks table
      for (const issue of issues) {
        const taskTitle = `[GitHub #${issue.number}] ${issue.title}`;
        
        // Find if task already exists for this issue
        const existingTask = await prisma.task.findFirst({
          where: {
            projectId: project.id,
            githubIssueNumber: issue.number
          }
        });

        if (!existingTask) {
          console.log(`  + Creating task for Issue #${issue.number}`);
          await prisma.task.create({
            data: {
              title: taskTitle,
              status: issue.state === 'OPEN' ? 'Backlog' : 'Done',
              projectId: project.id,
              githubIssueNumber: issue.number,
              githubIssueUrl: issue.url,
              githubStatus: issue.state.toLowerCase()
            }
          });
        } else {
          // Update status if it changed
          const newStatus = issue.state === 'OPEN' ? 'Backlog' : 'Done';
          if (existingTask.status !== newStatus || existingTask.githubStatus !== issue.state.toLowerCase()) {
            await prisma.task.update({
              where: { id: existingTask.id },
              data: {
                status: newStatus,
                githubStatus: issue.state.toLowerCase()
              }
            });
          }
        }
      }

      // 3. Fetch Recent PRs (optional, but good for context)
      const prsOutput = execSync(`gh pr list --repo ${repo} --limit 5 --json number,title,url,state,mergedAt`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      const prs = JSON.parse(prsOutput);
      
      // Store PRs as tasks too if they represent active work
      for (const pr of prs) {
        const prTitle = `[PR #${pr.number}] ${pr.title}`;
        const existingPr = await prisma.task.findFirst({
          where: {
            projectId: project.id,
            githubPrNumber: pr.number
          }
        });

        if (!existingPr) {
           await prisma.task.create({
            data: {
              title: prTitle,
              status: pr.state === 'OPEN' ? 'In Progress' : 'Done',
              projectId: project.id,
              githubPrNumber: pr.number,
              githubPrUrl: pr.url,
              githubStatus: pr.state.toLowerCase()
            }
          });
        }
      }

    } catch (e) {
      console.error(`  ! Error harvesting ${project.title}:`, e.message);
    }
  }

  console.log('--- Harvest Complete ---');
}

harvestGithubData()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
