const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function getDiskInfo() {
  console.log('Starting getDiskInfo...');
  const start = Date.now();
  try {
    console.log('Trying fsutil...');
    const { stdout } = await execAsync('fsutil volume diskfree c:', { timeout: 1000 });
    console.log(`fsutil done in ${Date.now() - start}ms`);
    return stdout;
  } catch (e) {
    console.log(`fsutil failed in ${Date.now() - start}ms: ${e.message}`);
    // Fallback to powershell with direct args
    try {
      console.log('Trying powershell direct...');
      const pstart = Date.now();
      const { stdout } = await execAsync('powershell -NoProfile -Command "Get-PSDrive C | Select-Object Used, Free"', { timeout: 2000 });
      console.log(`powershell done in ${Date.now() - pstart}ms`);
      return stdout;
    } catch (inner) {
      console.log(`powershell failed: ${inner.message}`);
    }
  }
  return null;
}

async function getGpuInfo() {
  console.log('Starting getGpuInfo...');
  const start = Date.now();
  try {
    const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,memory.free,memory.used --format=csv,noheader,nounits', { timeout: 2000 });
    console.log(`nvidia-smi done in ${Date.now() - start}ms`);
    return stdout;
  } catch (e) {
    console.log(`nvidia-smi failed in ${Date.now() - start}ms: ${e.message}`);
  }
  return null;
}

async function main() {
  const start = Date.now();
  await Promise.all([getDiskInfo(), getGpuInfo()]);
  console.log(`Total time: ${Date.now() - start}ms`);
}

main();
