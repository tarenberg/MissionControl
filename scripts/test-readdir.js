const fs = require('fs');
const path = require('path');
const target = 'C:\\Users\\tberg\\.openclaw\\workspace\\docs\\projects\\ArtTracker';

try {
  const items = fs.readdirSync(target, { withFileTypes: true });
  console.log('Items found:', items.map(i => i.name));
  items.forEach(i => {
    console.log(`${i.name} - isDirectory: ${i.isDirectory()}, isSymbolicLink: ${i.isSymbolicLink()}`);
  });
} catch (e) {
  console.error('Error:', e.message);
}
