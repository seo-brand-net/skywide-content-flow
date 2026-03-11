const fs = require('fs');
const FILE = 'DEV Skywide  Content (TEST v23).json';
const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let updated = false;

// 1. Rewire If nodes to bypass FAQ nodes and go straight to Export
const rewiringMap = {
    'If': 'Document Export Sanitization3',
    'If1': 'Document Export Sanitization4',
    'If2': 'Document Export Sanitization6',
    'If3': 'Document Export Sanitization7'
};

Object.entries(rewiringMap).forEach(([ifNode, targetNode]) => {
    if (d.connections[ifNode] && d.connections[ifNode].main) {
        d.connections[ifNode].main[0] = [
            { node: targetNode, type: 'main', index: 0 }
        ];
        updated = true;
        console.log(`✅ Rewired ${ifNode} -> ${targetNode}`);
    }
});

// 2. We can safely remove the FAQ Schema Generator and Append FAQ nodes from the node array and connections array
const obsoleteNodes = [
    'FAQ Schema Generator', 'FAQ Schema Generator1', 'FAQ Schema Generator2', 'FAQ Schema Generator3',
    'Append FAQ to Article', 'Append FAQ to Article1', 'Append FAQ to Article2', 'Append FAQ to Article3'
];

const initialNodeCount = d.nodes.length;
d.nodes = d.nodes.filter(n => !obsoleteNodes.includes(n.name));
if (d.nodes.length !== initialNodeCount) {
    console.log(`✅ Removed ${initialNodeCount - d.nodes.length} obsolete FAQ nodes.`);
    updated = true;
}

obsoleteNodes.forEach(nodeName => {
    if (d.connections[nodeName]) {
        delete d.connections[nodeName];
    }
});

if (updated) {
    fs.writeFileSync(FILE, JSON.stringify(d, null, 2), 'utf8');
    console.log('\\n✅ Done! File saved.');
} else {
    console.log('No fixes needed');
}
