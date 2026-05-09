const fs = require('fs');

async function main() {
  const start = Date.now();
  try {
    const stats = fs.statfsSync('C:');
    const total = stats.bsize * stats.blocks;
    const free = stats.bsize * stats.bfree;
    const available = stats.bsize * stats.bavail;
    const used = total - free;
    console.log(`Disk Info:`);
    console.log(`Total: ${total}`);
    console.log(`Free: ${free}`);
    console.log(`Available: ${available}`);
    console.log(`Used: ${used}`);
    console.log(`Done in ${Date.now() - start}ms`);
  } catch (e) {
    console.error(`Error: ${e.message}`);
  }
}

main();
