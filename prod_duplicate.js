const fs = require('fs');
const FILE = 'DEV Skywide  Content (TEST v23).json';
const PROD_FILE = 'PROD Skywide Content v23.json';

const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let updated = false;

// 1. Fix OpenAI Truncation by increasing maxTokens from 4096 to 16384 (or removing it entirely if it causes issues, but 16k is safe for GPT-4o)
d.nodes.forEach(n => {
    if (n.name.includes('OpenAI Draft')) {
        if (n.parameters && n.parameters.options && n.parameters.options.maxTokens) {
            n.parameters.options.maxTokens = 16384;
            updated = true;
            console.log(`✅ Increased maxTokens to 16384 for ${n.name}`);
        }
    }
});

// 2. Remove Testing Framework Nodes
const testNodes = [
    'Is Test Exit 4?', 'Is Test Exit 5?', 'Is Test Exit 6?', 'Is Test Exit 7?',
    'Is Test Exit 15?', 'Is Test Exit 16?', 'Is Test Mode?', 'Send Test Result'
];

const initialNodeCount = d.nodes.length;
d.nodes = d.nodes.filter(n => !testNodes.includes(n.name));
console.log(`✅ Removed ${initialNodeCount - d.nodes.length} testing nodes for Production.`);

// Remove connections associated with test nodes
testNodes.forEach(nodeName => {
    if (d.connections[nodeName]) {
        delete d.connections[nodeName];
    }
});

// 3. Rewire the output of the final nodes directly to the real Google Drive/Database endpoints rather than routing through the Test If nodes.
// Looking at the workflow, the "Document Export Sanitization" nodes were routing to the "Is Test Exit X?" nodes, which then routed to "A/B Database Push" and "Send Test Result".
// We need to bypass the "Is Test Exit X?" nodes entirely.

const rewiringMap = {
    // From Sanitization Node -> To the real Push node
    'Document Export Sanitization': 'A/B Database Push',
    'Document Export Sanitization4': 'A/B Database Push1',
    'Document Export Sanitization6': 'A/B Database Push2',
    'Document Export Sanitization7': 'A/B Database Push3',
    'Document Export Sanitization3': 'A/B Database Push4',
    'Document Export Sanitization5': 'A/B Database Push5'
};

Object.entries(rewiringMap).forEach(([sourceNode, targetNode]) => {
    // Make sure both exist in the new Prod JSON
    if (d.nodes.find(n => n.name === sourceNode) && d.nodes.find(n => n.name === targetNode)) {
        if (!d.connections[sourceNode]) d.connections[sourceNode] = { main: [[]] };

        d.connections[sourceNode].main[0] = [
            { node: targetNode, type: 'main', index: 0 }
        ];
        console.log(`✅ Rewired ${sourceNode} directly to ${targetNode}`);
    }
});

// Rename the workflow
d.name = "PROD Skywide Content v23";

fs.writeFileSync(PROD_FILE, JSON.stringify(d, null, 2), 'utf8');
console.log(`\\n✅ Successfully created Production workflow at: ${PROD_FILE}`);

