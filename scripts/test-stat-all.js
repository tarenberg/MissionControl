const fs = require('fs');
const path = require('path');
const target = 'C:\\Users\\tberg\\.openclaw\\workspace\\docs\\projects\\ArtSubmissions';

try {
  const items = fs.readdirSync(target, { withFileTypes: true });
  console.log('Items found:', items.map(i => i.name));
  for (const i of items) {
    const fullPath = path.join(target, i.name);
    try {
        const stats = fs.statSync(fullPath);
        console.log(`${i.name} - isDirectory: ${stats.isDirectory()}, size: ${stats.size}`);
    } catch (e) {
        console.log(`${i.name} - STAT ERROR: ${e.message}`);
    }
  }
} catch (e) {
  console.error('Error:', e.message);
}
