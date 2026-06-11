const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const nodeNames = new Set(wf.nodes.map(n => n.name));
let brokenConnections = [];

for (const [source, targets] of Object.entries(wf.connections)) {
    if (!nodeNames.has(source)) {
        brokenConnections.push(`Source node missing: ${source}`);
    }
    for (const port in targets) {
        targets[port].forEach(arr => {
            arr.forEach(c => {
                if (!nodeNames.has(c.node)) {
                    brokenConnections.push(`${source} connects to missing node: ${c.node}`);
                }
            });
        });
    }
}

if (brokenConnections.length > 0) {
    console.log('Broken connections found:');
    console.log([...new Set(brokenConnections)].join('\n'));
} else {
    console.log('All connections valid.');
}
