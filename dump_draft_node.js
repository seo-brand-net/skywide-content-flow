const fs = require('fs');
const d = JSON.parse(fs.readFileSync('DEV Skywide  Content (TEST v23).json', 'utf8'));
const n = d.nodes.find(x => x.name === 'OpenAI Draft (GPT-4O)1');
fs.writeFileSync('draft_node.json', JSON.stringify(n, null, 2));
