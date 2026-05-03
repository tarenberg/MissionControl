const fs = require('fs');
const path = require('path');

const WORKSPACE = 'C:\\Users\\tberg\\.openclaw\\workspace';
const TARGET_PATH = 'docs/projects/ArtTracker';

function test(currentPath) {
  const cleanPath = currentPath.startsWith('/') ? currentPath.slice(1) : currentPath;
  const absolutePath = path.join(WORKSPACE, cleanPath);
  console.log('--- Testing Path:', currentPath);
  console.log('Absolute Path:', absolutePath);

  try {
    const items = fs.readdirSync(absolutePath, { withFileTypes: true });
    const result = items.map(item => {
      const itemPath = path.join(absolutePath, item.name);
      console.log('Processing item:', item.name);
      try {
        const stats = fs.statSync(itemPath);
        const rel = path.relative(WORKSPACE, itemPath).replace(/\\/g, '/');
        console.log('  Stats OK. RelPath:', rel);
        return { name: item.name, path: rel };
      } catch (e) {
        console.log('  Stats FAILED:', e.message);
        return { name: item.name, error: e.message };
      }
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Readdir FAILED:', err.message);
  }
}

test(TARGET_PATH);
test('/' + TARGET_PATH);
