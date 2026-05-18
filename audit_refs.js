const fs = require('fs');
const data = JSON.parse(fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8'));

// Extract ALL expression references from every node parameter
const refs = [];
const scan = (obj, nodeName, path) => {
  if (typeof obj === 'string' && obj.includes("$('")) {
    const matches = obj.match(/\$\('[^']+'\)[^}'\s]*/g) || [];
    matches.forEach(m => refs.push({ fromNode: nodeName, path, ref: m.trim().substring(0, 150) }));
  } else if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([k, v]) => scan(v, nodeName, path + '.' + k));
  }
};
data.nodes.forEach(n => scan(n.parameters, n.name, ''));

// Group by fromNode
const grouped = {};
refs.forEach(r => {
  if (!grouped[r.fromNode]) grouped[r.fromNode] = [];
  grouped[r.fromNode].push(r.ref);
});

// Print only key nodes
const targetNodes = [
  'Pre-Draft Fact Checker',
  'Post-Draft Fact Checker', 
  'Data Check & Research Gaps1',
  'Parse Creative Brief (LLM)',
  'Keyword Strategist',
  'OpenAI Draft (GPT-4O)1',
  'Claude Draft (Claude Opus 3)1'
];

targetNodes.forEach(n => {
  if (grouped[n]) {
    console.log('\n===', n, '===');
    [...new Set(grouped[n])].forEach(r => console.log(' ', r));
  } else {
    console.log('\n===', n, '=== (no refs found)');
  }
});

// Also show what Parse Creative Brief (LLM) node outputs
const parseNode = data.nodes.find(n => n.name === 'Parse Creative Brief (LLM)');
console.log('\n\n=== Parse Creative Brief (LLM) node parameters ===');
console.log(JSON.stringify(parseNode?.parameters, null, 2).substring(0, 800));
