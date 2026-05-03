const path = require('path');
const workspace = 'C:\\Users\\tberg\\.openclaw\\workspace';
const currentPath = '/docs/projects/ArtTracker';
console.log('Join:', path.join(workspace, currentPath));
console.log('Resolve:', path.resolve(workspace, currentPath));
// The correct way if currentPath starts with / but is meant to be relative to workspace:
console.log('Fixed:', path.join(workspace, currentPath.startsWith('/') ? currentPath.slice(1) : currentPath));
