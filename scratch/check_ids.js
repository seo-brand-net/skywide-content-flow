const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const ids = wf.nodes.map(n => n.id);
const uniqueIds = new Set(ids);
if (ids.length !== uniqueIds.size) {
    console.log('Duplicate IDs found!');
    const counts = {};
    ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    for (const [id, count] of Object.entries(counts)) {
        if (count > 1) {
            console.log(`ID ${id} appears ${count} times.`);
        }
    }
} else {
    console.log('All node IDs are unique.');
}
