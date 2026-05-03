const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const PROJECTS_ROOT = 'C:\\Users\\tberg\\Documents\\_PROJECTS';

async function cloneMissing() {
  console.log('--- Checking for Missing GitHub Projects ---');

  const projects = await prisma.project.findMany({
    where: {
      githubUrl: { not: null, not: '' }
    }
  });

  for (const project of projects) {
    const localDir = project.localUrl || path.join(PROJECTS_ROOT, project.title.replace(/\s+/g, ''));
    
    if (!fs.existsSync(localDir)) {
      console.log(`[${project.title}] Local directory missing. Attempting to clone from ${project.githubUrl}...`);
      
      try {
        // Extract repo name from URL (e.g., https://github.com/user/repo -> user/repo)
        const repoMatch = project.githubUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
        if (!repoMatch) {
          console.error(`  ! Could not parse repo from URL: ${project.githubUrl}`);
          continue;
        }
        const repo = repoMatch[1];

        // Ensure the projects root exists
        if (!fs.existsSync(PROJECTS_ROOT)) {
          fs.mkdirSync(PROJECTS_ROOT, { recursive: true });
        }

        // Clone the repo
        console.log(`  > Cloning ${repo} into ${localDir}...`);
        execSync(`gh repo clone ${repo} "${localDir}"`, { stdio: 'inherit' });

        // Update the database
        await prisma.project.update({
          where: { id: project.id },
          data: { localUrl: localDir }
        });
        
        console.log(`  ✓ Successfully cloned and updated database.`);
      } catch (e) {
        console.error(`  ! Error cloning ${project.title}:`, e.message);
      }
    } else {
      // If localUrl was null but directory actually exists (from a manual move or previous sync error)
      if (!project.localUrl) {
         await prisma.project.update({
          where: { id: project.id },
          data: { localUrl: localDir }
        });
        console.log(`[${project.title}] Folder exists locally. Linked database.`);
      }
    }
  }

  console.log('--- Clone Check Complete ---');
}

cloneMissing()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
