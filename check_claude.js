const fs = require('fs');
const FILE = 'DEV Skywide  Content (TEST v23).json';
const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const claudeNode = d.nodes.find(x => x.name.includes('Claude Draft'));
console.log('--- Claude Parameters ---');
console.dir(claudeNode.parameters, { depth: null });
