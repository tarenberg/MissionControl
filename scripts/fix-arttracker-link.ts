import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: 'proj-arttracker' },
  });

  if (!project) {
    console.error('Project not found');
    return;
  }

  let githubRepoJson: any = {};
  if (project.githubRepo) {
    try {
      githubRepoJson = JSON.parse(project.githubRepo);
    } catch (e) {
      console.warn('Failed to parse githubRepo JSON, starting fresh');
    }
  }

  githubRepoJson.launchUrl = '/art-tracker';
  
  const updatedProject = await prisma.project.update({
    where: { id: 'proj-arttracker' },
    data: {
      githubRepo: JSON.stringify(githubRepoJson),
      status: 'active',
      devUrl: '/art-tracker' // Also update devUrl for consistency
    },
  });

  console.log('Updated ArtTracker:', updatedProject);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
