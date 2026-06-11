const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const nodeNames = new Set(wf.nodes.map(n => n.name));

// Build adjacency graph (directed)
const graph = {};
wf.nodes.forEach(n => graph[n.name] = []);

for (const [source, targets] of Object.entries(wf.connections)) {
    for (const port in targets) {
        targets[port].forEach(arr => {
            arr.forEach(c => {
                if (graph[source]) {
                    graph[source].push(c.node);
                }
            });
        });
    }
}

// Function to check if target is reachable from source
function isReachable(source, target, visited = new Set()) {
    if (source === target) return true;
    visited.add(source);
    if (!graph[source]) return false;
    for (let child of graph[source]) {
        if (!visited.has(child)) {
            if (isReachable(child, target, visited)) return true;
        }
    }
    return false;
}

let errors = [];

wf.nodes.forEach(n => {
    if (n.parameters) {
        let pStr = JSON.stringify(n.parameters);
        
        // Find all $() references
        const regex = /\$\(['"]([^'"]+)['"]\)/g;
        let match;
        while ((match = regex.exec(pStr)) !== null) {
            const refNodeName = match[1];
            
            // 1. Check if node exists
            if (!nodeNames.has(refNodeName)) {
                errors.push(`Node '${n.name}' references non-existent node '${refNodeName}'`);
                continue;
            }
            
            // 2. Check execution order
            // If refNodeName is reachable FROM n.name, then n.name runs BEFORE refNodeName! That's an error unless it's guarded.
            // Actually, in a DAG, if refNodeName is reachable from n.name, it runs after.
            if (isReachable(n.name, refNodeName)) {
                // Check if it's guarded by .isExecuted
                // We'll just check if the string contains .isExecuted
                // This is a naive check but works for our patterns
                if (!pStr.includes(`${refNodeName}').isExecuted`)) {
                     errors.push(`Node '${n.name}' references '${refNodeName}' which runs AFTER it!`);
                }
            }
        }
    }
});

if (errors.length > 0) {
    console.log("Found issues:");
    console.log([...new Set(errors)].join('\n'));
} else {
    console.log("All references appear solid! No forward-references or missing nodes found.");
}
