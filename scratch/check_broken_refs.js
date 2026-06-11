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
const brokenRefs = [];

// Recursive function to scan all strings for references
function scanObject(obj, contextNode) {
    if (typeof obj === 'string') {
        const matches = obj.match(/\$\('([^']+)'\)/g);
        if (matches) {
            matches.forEach(match => {
                const refNodeName = match.match(/\$\('([^']+)'\)/)[1];
                if (!nodeNames.has(refNodeName)) {
                    brokenRefs.push({ node: contextNode, ref: refNodeName });
                }
            });
        }
    } else if (Array.isArray(obj)) {
        obj.forEach(item => scanObject(item, contextNode));
    } else if (obj !== null && typeof obj === 'object') {
        for (const key in obj) {
            scanObject(obj[key], contextNode);
        }
    }
}

wf.nodes.forEach(n => {
    scanObject(n.parameters, n.name);
});

if (brokenRefs.length > 0) {
    console.log('Found broken references:');
    const grouped = {};
    brokenRefs.forEach(r => {
        if (!grouped[r.ref]) grouped[r.ref] = new Set();
        grouped[r.ref].add(r.node);
    });
    for (const [ref, nodes] of Object.entries(grouped)) {
        console.log(`Node referenced: "${ref}" (missing) is used in nodes:`, Array.from(nodes).join(', '));
    }
} else {
    console.log('No broken references found!');
}
