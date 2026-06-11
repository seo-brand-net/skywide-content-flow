const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const mergesToDelete = new Set(['Merge3', 'Merge5', 'Merge6', 'Merge7']);

// Define the bypass mappings: Source -> Target
const bypassMappings = {
    'Claude Draft (Claude Opus 3)1': 'Data Check & Research Gaps1',
    'Claude Keyword Check + Semantic Gap1': 'Wait18',
    'Claude EEAT Injection1': 'Wait14',
    'Claude NLP & PR Optimization': 'Wait7'
};

// Update connections to bypass the Merge nodes
for (const source in bypassMappings) {
    const target = bypassMappings[source];
    // Re-wire source to point directly to target instead of Merge
    if (!wf.connections[source]) wf.connections[source] = { main: [[]] };
    wf.connections[source].main[0] = [{ node: target, type: 'main', index: 0 }];
}

// Delete the Merge nodes themselves
wf.nodes = wf.nodes.filter(n => !mergesToDelete.has(n.name));

// Clean out the old Merge connections from the graph
for (const source in wf.connections) {
  if (mergesToDelete.has(source)) {
    delete wf.connections[source];
    continue;
  }
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Successfully bypassed and deleted Merge3, Merge5, Merge6, and Merge7.');
