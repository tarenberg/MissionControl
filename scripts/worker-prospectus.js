const { exec } = require('child_process');
const path = require('path');

let isRunning = false;

function run() {
  if (isRunning) return;
  isRunning = true;
  
  console.log(`[${new Date().toISOString()}] Scanning for prospectus requests...`);
  
  const proc = exec('node scripts/process-prospectus-gemini.js', { 
    cwd: path.join(__dirname, '..')
  });

  proc.stdout.on('data', (data) => console.log(data.trim()));
  proc.stderr.on('data', (data) => console.error(data.trim()));

  proc.on('close', (code) => {
    isRunning = false;
  });
}

setInterval(run, 10000);
run();
