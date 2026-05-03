const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient();
const PROJECTS_DIR = 'C:\\Users\\tberg\\Documents\\_PROJECTS';

function getGithubUrl(dirPath) {
  try {
    const remote = execSync('git remote get-url origin', { cwd: dirPath, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (remote.includes('github.com')) {
      // Normalize git@github.com:user/repo.git or https://github.com/user/repo.git to https://github.com/user/repo
      return remote
        .replace(/^git@github\.com:/, 'https://github.com/')
        .replace(/\.git$/, '');
    }
  } catch (e) {
    // Not a git repo or no remote origin
  }
  return null;
}

async function syncProjects() {
  console.log('--- Starting Project Sync ---');
  
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error(`Error: Projects directory ${PROJECTS_DIR} does not exist.`);
    return;
  }

  const directories = fs.readdirSync(PROJECTS_DIR).filter(file => {
    return fs.statSync(path.join(PROJECTS_DIR, file)).isDirectory();
  });

  console.log(`Found ${directories.length} directories in _PROJECTS.`);

  const existingProjects = await prisma.project.findMany();
  
  for (const dir of directories) {
    const fullPath = path.join(PROJECTS_DIR, dir);
    const githubUrl = getGithubUrl(fullPath);
    const slug = dir.toLowerCase().replace(/\s+/g, '-');
    
    // Check if project already exists by title or localUrl
    const existing = existingProjects.find(p => 
      p.title.toLowerCase() === dir.toLowerCase() || 
      p.localUrl === fullPath ||
      p.id === `proj-${slug}`
    );

    if (existing) {
      console.log(`Updating existing project: ${existing.title} (${dir})${githubUrl ? ' + GitHub URL' : ''}`);
      await prisma.project.update({
        where: { id: existing.id },
        data: {
          localUrl: fullPath,
          githubUrl: githubUrl || existing.githubUrl,
          status: existing.status === 'Planning' ? 'Active' : existing.status
        }
      });
    } else {
      console.log(`Adding new project: ${dir}${githubUrl ? ' with GitHub URL' : ''}`);
      await prisma.project.create({
        data: {
          id: `proj-${slug}`,
          title: dir,
          description: `Auto-discovered project from ${PROJECTS_DIR}`,
          status: 'Active',
          localUrl: fullPath,
          githubUrl: githubUrl
        }
      });
    }
  }

  console.log('--- Sync Complete ---');
}

syncProjects()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
