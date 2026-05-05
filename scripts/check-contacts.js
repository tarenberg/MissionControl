const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contacts = await prisma.contact.findMany();
  console.log('Contacts:', JSON.stringify(contacts, null, 2));
  
  const agents = require('../data/agents.json');
  console.log('Agents:', JSON.stringify(agents, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
