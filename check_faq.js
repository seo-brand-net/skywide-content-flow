const fs = require('fs');
const d = JSON.parse(fs.readFileSync('DEV Skywide  Content (TEST v23).json', 'utf8'));
const n1 = d.nodes.find(n => n.name === 'FAQ Schema Generator');
const n2 = d.nodes.find(n => n.name === 'Append FAQ to Article');
console.log("FAQ Schema Generator parameters:");
console.dir(n1.parameters, { depth: null });
console.log("\\nAppend FAQ to Article parameters:");
console.dir(n2.parameters, { depth: null });
