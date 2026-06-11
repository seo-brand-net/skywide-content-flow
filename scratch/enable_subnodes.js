const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

let patchedCount = 0;
const subNodeNames = new Set();

// Find all nodes that are used as sub-nodes (connected via ai_*)
for (const [sourceNode, targets] of Object.entries(wf.connections)) {
    for (const [portType, portConnections] of Object.entries(targets)) {
        if (portType.startsWith('ai_')) {
            portConnections.forEach(connArray => {
                connArray.forEach(conn => {
                    // sourceNode is the sub-node being plugged INTO conn.node
                    subNodeNames.add(sourceNode);
                });
            });
        }
    }
}

console.log('Sub-nodes found:', Array.from(subNodeNames));

wf.nodes.forEach(n => {
    if (subNodeNames.has(n.name)) {
        if (n.disabled === true) {
            delete n.disabled; // Enable the node
            patchedCount++;
            console.log(`Enabled sub-node: ${n.name}`);
        }
    }
});

if (patchedCount > 0) {
    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log(`Saved patched workflow. Enabled ${patchedCount} sub-nodes.`);
} else {
    console.log("All sub-nodes are already enabled.");
}
