const http = require('http');

const endpoints = [
  '/api/skills',
  '/api/models-status',
  '/api/studio/environment',
  '/api/live-activities',
  '/api/system-status',
  '/api/system/pulse',
  '/api/system/logs'
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(`http://localhost:3002${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          endpoint,
          status: res.statusCode,
          duration: Date.now() - start,
          size: data.length
        });
      });
    });
    req.on('error', (err) => {
      resolve({
        endpoint,
        status: 'error',
        duration: Date.now() - start,
        error: err.message
      });
    });
  });
}

async function main() {
  console.log('Testing endpoints on port 3002 (Direct)...');
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    console.log(`${endpoint.padEnd(25)}: ${result.status} | ${result.duration}ms | ${result.size || 0} bytes`);
  }
}

main();
