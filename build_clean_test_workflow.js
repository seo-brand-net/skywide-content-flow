/**
 * build_clean_test_workflow.js
 * ----------------------------
 * 1. Takes the latest DEV Skywide Content.json.
 * 2. Rescales coordinates so it's visible in n8n.
 * 3. Injects only the testing bypasses and the reporting node.
 * 4. Maintains the exact logic of DEV for everything else.
 */

const fs = require('fs');
const { randomUUID } = require('crypto');

const DEV_FILE = 'DEV Skywide  Content.json';
const OLD_FILE = 'TEST Skywide  Content old.json';
const OUT_FILE = 'TEST Skywide Content (Prompt Review).json';

console.log('Reading source files...');
const dev = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'));
const old = JSON.parse(fs.readFileSync(OLD_FILE, 'utf8'));

// --- 1. COORDINATE RESCALING ---
const devXs = dev.nodes.filter(n => n.position).map(n => n.position[0]);
const devYs = dev.nodes.filter(n => n.position).map(n => n.position[1]);
const devMinX = Math.min(...devXs), devMaxX = Math.max(...devXs);
const devMinY = Math.min(...devYs), devMaxY = Math.max(...devYs);

const oldXs = old.nodes.filter(n => n.position).map(n => n.position[0]);
const oldYs = old.nodes.filter(n => n.position).map(n => n.position[1]);
const oldMinX = Math.min(...oldXs), oldMaxX = Math.max(...oldXs);
const oldMinY = Math.min(...oldYs), oldMaxY = Math.max(...oldYs);

function rescale(val, srcMin, srcMax, dstMin, dstMax) {
    if (srcMax === srcMin) return dstMin;
    return dstMin + (val - srcMin) / (srcMax - srcMin) * (dstMax - dstMin);
}

// Rescale all DEV nodes
const nodes = dev.nodes.map(n => {
    if (!n.position) return n;
    return {
        ...n,
        position: [
            Math.round(rescale(n.position[0], devMinX, devMaxX, oldMinX, oldMaxX)),
            Math.round(rescale(n.position[1], devMinY, devMaxY, oldMinY, oldMaxY))
        ]
    };
});

let connections = JSON.parse(JSON.stringify(dev.connections));

// --- 2. INJECT TESTING INFRA ---

// A. "Is Test Mode?" Bypass
const isTestModeRef = old.nodes.find(n => n.name === 'Is Test Mode?');
const isTestMode = JSON.parse(JSON.stringify(isTestModeRef));
isTestMode.id = randomUUID();
// Place it between Keyword Validator and Clean1/Create Folder
const kvPos = nodes.find(n => n.name === 'Keyword Validator').position;
isTestMode.position = [kvPos[0] + 200, kvPos[1]];
nodes.push(isTestMode);

// Rewire Keyword Validator -> Is Test Mode?
connections['Keyword Validator'] = {
    main: [[{ node: 'Is Test Mode?', type: 'main', index: 0 }]]
};
// Wire Is Test Mode? (True/Test) -> Clean1, (False/Prod) -> Create folder1
connections[isTestMode.name] = {
    main: [
        [{ node: 'Clean1', type: 'main', index: 0 }],
        [{ node: 'Create folder1', type: 'main', index: 0 }]
    ]
};

// B. "Send Test Result" Node
const sendTestResultRef = old.nodes.find(n => n.name === 'Send Test Result');
const sendTestResult = JSON.parse(JSON.stringify(sendTestResultRef));
sendTestResult.id = randomUUID();
// Place it at the far right
sendTestResult.position = [oldMaxX + 500, 0];
nodes.push(sendTestResult);

// C. Exit Gates (Is Test Exit X?)
// These nodes check if we should divert to Send Test Result instead of Google Docs.
const exitGateNames = [
    'Is Test Exit 4?', 'Is Test Exit 5?', 'Is Test Exit 6?', 
    'Is Test Exit 7?', 'Is Test Exit 15?', 'Is Test Exit 16?'
];

// Map of DEV nodes that currently lead to Google Docs
const devExits = {
    '80 +?4': 'Create a document7',
    'Check Max Iterations2': 'Improvement LLM2', // Wait, Check Max Iterations 2 True is exit? No, True is STOP.
    '80 +?6': 'Create a document6',
    'Check Max Iterations3': 'Improvement LLM3', // Same here.
    'Document Export Sanitization3': 'Create a document',
    'Document Export Sanitization4': 'Create a document17',
    'Document Export Sanitization6': 'Create a document16',
    'Document Export Sanitization7': 'Create a document15'
};

// Let's actually look at where the original DEV exit points were.
// From audit:
// 80 +?4 -> Create a document7 (True) | Max Iterations2 (False)
// Document Export Sanitization3 -> Create a document

const mappings = [
    { from: '80 +?4', to: 'Create a document7', exitName: 'Is Test Exit 4?' },
    { from: '80 +?6', to: 'Create a document6', exitName: 'Is Test Exit 6?' },
    { from: 'Document Export Sanitization3', to: 'Create a document', exitName: 'Is Test Exit 15?' },
    { from: 'Document Export Sanitization4', to: 'Create a document17', exitName: 'Is Test Exit 16?' },
    { from: 'Document Export Sanitization6', to: 'Create a document16', exitName: 'Is Test Exit 7?' }, // Mapping based on old names
    { from: 'Document Export Sanitization7', to: 'Create a document15', exitName: 'Is Test Exit 5?' }
];

mappings.forEach(m => {
    const refExit = old.nodes.find(n => n.name === m.exitName);
    if (!refExit) return;

    const exitNode = JSON.parse(JSON.stringify(refExit));
    exitNode.id = randomUUID();
    const fromNode = nodes.find(n => n.name === m.from);
    if (!fromNode) return;
    
    exitNode.position = [fromNode.position[0] + 200, fromNode.position[1]];
    nodes.push(exitNode);

    // Update connection: fromNode -> exitNode
    // We need to be careful with the output index. 
    // For 80 +?4, the exit is index 0 (True).
    const devConn = connections[m.from];
    if (devConn && devConn.main) {
        let portIndex = -1;
        devConn.main.forEach((port, idx) => {
            if (port && port.some(c => c.node === m.to)) {
                portIndex = idx;
            }
        });

        if (portIndex !== -1) {
            // Found the connection to the doc node. Divert it.
            devConn.main[portIndex] = devConn.main[portIndex].map(c => {
                if (c.node === m.to) {
                    return { node: exitNode.name, type: 'main', index: 0 };
                }
                return c;
            });
        }
    } else if (!devConn) {
        // Some nodes like Sanitization don't have connections entry if they only have one output
        connections[m.from] = {
            main: [[{ node: exitNode.name, type: 'main', index: 0 }]]
        };
    }

    // Wire exitNode: (True) -> Send Test Result, (False) -> m.to
    connections[exitNode.name] = {
        main: [
            [{ node: 'Send Test Result', type: 'main', index: 0 }],
            [{ node: m.to, type: 'main', index: 0 }]
        ]
    };
});

// Final check on Send Test Result connections (it has no outputs)
connections['Send Test Result'] = { main: [] };

// --- 3. FINAL ENVELOPE ---
const workflow = {
    name: 'TEST Skywide Content (Prompt Review)',
    nodes,
    pinData: {}, // Start fresh for prompt review
    connections,
    active: false,
    settings: { executionOrder: 'v1' },
    versionId: randomUUID(),
    meta: dev.meta || {},
    id: randomUUID().replace(/-/g, '').substring(0, 16),
    tags: old.tags || []
};

// --- 4. WEBHOOK & PATH ---
const wh = nodes.find(n => n.name === 'Webhook1');
wh.parameters.path = 'content-engine-test-unique';
wh.parameters.responseMode = 'onReceived';

fs.writeFileSync(OUT_FILE, JSON.stringify(workflow, null, 2), 'utf8');

console.log('\n✅ Clean rebuild complete.');
console.log('Nodes:', nodes.length);
console.log('Webhook:', wh.parameters.path);
console.log('Target:', OUT_FILE);
