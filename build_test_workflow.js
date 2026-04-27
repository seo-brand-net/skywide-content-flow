/**
 * build_test_workflow.js
 * ----------------------
 * Creates "TEST Skywide Content (Prompt Review).json" by:
 *   1. Starting from DEV Skywide Content.json  (latest prompts + nodes)
 *   2. Rescaling all node positions to the OLD test workflow coordinate space
 *      (so n8n renders them correctly — DEV coords are ~300x too large)
 *   3. Injecting all test-infra nodes from TEST Skywide Content old.json
 *   4. Wiring all test-infra connections from the old file
 *   5. Updating webhook path → content-test  (matches old test file)
 *   6. Setting all HTTP callbacks → /api/test-callback
 *   7. Adding required n8n envelope fields: name, id, versionId, tags, settings
 *   8. Copying pinData from the old test file
 */

const fs = require('fs');
const { randomUUID } = require('crypto');

const DEV_FILE  = 'DEV Skywide  Content.json';
const OLD_FILE  = 'TEST Skywide  Content old.json';
const OUT_FILE  = 'TEST Skywide Content (Prompt Review).json';

console.log('Reading source files...');
const dev = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'));
const old = JSON.parse(fs.readFileSync(OLD_FILE, 'utf8'));

// ─── 1. NORMALISE DEV NODE POSITIONS ─────────────────────────────────────────
// DEV coords:  X 512000–523936 / Y 106960–109904  (wildly inflated)
// OLD coords:  X -15168–(-2576) / Y -1600–1488    (normal n8n range)
// Strategy: linear rescale DEV range onto OLD range

const devXs = dev.nodes.filter(n=>n.position).map(n=>n.position[0]);
const devYs = dev.nodes.filter(n=>n.position).map(n=>n.position[1]);
const devMinX = Math.min(...devXs), devMaxX = Math.max(...devXs);
const devMinY = Math.min(...devYs), devMaxY = Math.max(...devYs);

const oldXs = old.nodes.filter(n=>n.position).map(n=>n.position[0]);
const oldYs = old.nodes.filter(n=>n.position).map(n=>n.position[1]);
const oldMinX = Math.min(...oldXs), oldMaxX = Math.max(...oldXs);
const oldMinY = Math.min(...oldYs), oldMaxY = Math.max(...oldYs);

function rescale(val, srcMin, srcMax, dstMin, dstMax) {
  if (srcMax === srcMin) return dstMin;
  return dstMin + (val - srcMin) / (srcMax - srcMin) * (dstMax - dstMin);
}

// Apply rescaling to all DEV nodes
const devNodes = dev.nodes.map(n => {
  if (!n.position) return n;
  return {
    ...n,
    position: [
      Math.round(rescale(n.position[0], devMinX, devMaxX, oldMinX, oldMaxX)),
      Math.round(rescale(n.position[1], devMinY, devMaxY, oldMinY, oldMaxY)),
    ]
  };
});

console.log('✓ Node positions rescaled to OLD coordinate space');

// ─── 2. BUILD BASE NODE LIST FROM DEV ─────────────────────────────────────────
// Start with rescaled DEV nodes as our base
let nodes = [...devNodes];
let connections = JSON.parse(JSON.stringify(dev.connections));

// ─── 3. INJECT TEST-INFRA NODES FROM OLD FILE ─────────────────────────────────
const testOnlyNodeNames = [
  'Is Test Mode?',
  'Is Test Exit 4?', 'Is Test Exit 5?', 'Is Test Exit 6?',
  'Is Test Exit 7?', 'Is Test Exit 15?', 'Is Test Exit 16?',
  'Send Test Result',
  'FAQ Schema Generator',  'Append FAQ to Article',
  'FAQ Schema Generator1', 'Append FAQ to Article1',
  'FAQ Schema Generator2', 'Append FAQ to Article2',
  'FAQ Schema Generator3', 'Append FAQ to Article3',
  'Create a document4', 'Update a document4',
  'Create a document5', 'Update a document5',
];

testOnlyNodeNames.forEach(name => {
  // Remove if already present (avoid dupes from DEV)
  nodes = nodes.filter(n => n.name !== name);

  const refNode = old.nodes.find(n => n.name === name);
  if (!refNode) { console.warn('  ⚠ Not found in old:', name); return; }

  const cloned = JSON.parse(JSON.stringify(refNode));
  cloned.id = randomUUID(); // fresh UUID
  nodes.push(cloned);
  console.log('✓ Injected:', name);
});

// ─── 4. COPY ALL TEST-INFRA CONNECTIONS FROM OLD FILE ─────────────────────────
const connectionsToImport = [
  'Is Test Mode?',
  'Is Test Exit 4?', 'Is Test Exit 5?', 'Is Test Exit 6?',
  'Is Test Exit 7?', 'Is Test Exit 15?', 'Is Test Exit 16?',
  'FAQ Schema Generator',  'Append FAQ to Article',
  'FAQ Schema Generator1', 'Append FAQ to Article1',
  'FAQ Schema Generator2', 'Append FAQ to Article2',
  'FAQ Schema Generator3', 'Append FAQ to Article3',
];
connectionsToImport.forEach(name => {
  if (old.connections[name]) {
    connections[name] = JSON.parse(JSON.stringify(old.connections[name]));
  }
});

// ─── 5. REWIRE NODES THAT FEED INTO TEST INFRA ────────────────────────────────
// Keyword Validator → Is Test Mode?  (instead of Keyword Validator → Clean1 directly)
connections['Keyword Validator'] = {
  main: [[{ node: 'Is Test Mode?', type: 'main', index: 0 }]]
};

// Is Test Mode? true → Clean1, false → Create folder1  (from old file)
// (already copied above from old.connections['Is Test Mode?'])

// AI Agent → FAQ Schema Generator  (instead of direct to Document Export Sanitization3)
if (old.connections['If'])  connections['If']  = JSON.parse(JSON.stringify(old.connections['If']));
if (old.connections['If1']) connections['If1'] = JSON.parse(JSON.stringify(old.connections['If1']));
if (old.connections['If2']) connections['If2'] = JSON.parse(JSON.stringify(old.connections['If2']));
if (old.connections['If3']) connections['If3'] = JSON.parse(JSON.stringify(old.connections['If3']));

// Exit gates: copy from old so they all feed Send Test Result
['80 +?4','Check Max Iterations2','80 +?6','Check Max Iterations3',
 'Document Export Sanitization3','Document Export Sanitization4',
 'Document Export Sanitization6','Document Export Sanitization7'
].forEach(name => {
  if (old.connections[name]) {
    connections[name] = JSON.parse(JSON.stringify(old.connections[name]));
  }
});

console.log('✓ Test-infra connections wired');

// ─── 6. WEBHOOK PATH ──────────────────────────────────────────────────────────
const whNode = nodes.find(n => n.name === 'Webhook1');
if (whNode) {
  whNode.parameters.path = 'content-engine-test-unique'; // matches N8N_TEST_WEBHOOK_URL in .env
  whNode.parameters.responseMode = 'onReceived';
  console.log('✓ Webhook path → content-test');
}

// ─── 7. HTTP CALLBACKS → /api/test-callback ───────────────────────────────────
// Google Drive Notification1 — use the old test version (PATCH to Supabase)
const oldGDN = old.nodes.find(n => n.name === 'Google Drive Notification1');
const ourGDN = nodes.find(n => n.name === 'Google Drive Notification1');
if (oldGDN && ourGDN) {
  ourGDN.parameters = JSON.parse(JSON.stringify(oldGDN.parameters));
  console.log('✓ Google Drive Notification1 → old test params (Supabase PATCH)');
}

// Startup Update, Send Error, Signal Completion → /api/test-callback
['Startup Update','Send Error to Dashboard','Signal Completion (Update a document17)'].forEach(name => {
  const n = nodes.find(x => x.name === name);
  if (n && n.parameters) {
    n.parameters.url = 'https://skywide-content-flow.vercel.app/api/test-callback';
    console.log('✓', name, '→ /api/test-callback');
  }
});

// ─── 8. COPY PINDATA FROM OLD FILE ────────────────────────────────────────────
const pinData = JSON.parse(JSON.stringify(old.pinData || {}));
console.log(`✓ Copied pinData (${Object.keys(pinData).length} pinned nodes)`);

// ─── 9. BUILD FINAL WORKFLOW OBJECT ───────────────────────────────────────────
const workflow = {
  name:        'TEST Skywide Content (Prompt Review)',
  nodes,
  pinData,
  connections,
  active:      false,
  settings:    { executionOrder: 'v1' },
  versionId:   randomUUID(),
  meta:        dev.meta || {},
  id:          randomUUID().replace(/-/g, '').substring(0, 16),
  tags:        old.tags || [],
};

// ─── 10. VERIFY ───────────────────────────────────────────────────────────────
const xs = nodes.filter(n=>n.position).map(n=>n.position[0]);
const ys = nodes.filter(n=>n.position).map(n=>n.position[1]);
console.log('\n=== VERIFICATION ===');
console.log('Total nodes:', nodes.length);
console.log('X range:', Math.min(...xs), 'to', Math.max(...xs));
console.log('Y range:', Math.min(...ys), 'to', Math.max(...ys));
console.log('Webhook path:', whNode?.parameters?.path);
console.log('Top-level keys:', Object.keys(workflow));

// ─── 11. WRITE ────────────────────────────────────────────────────────────────
fs.writeFileSync(OUT_FILE, JSON.stringify(workflow, null, 2), 'utf8');
console.log('\n✅ Done →', OUT_FILE);
console.log('\nImport into n8n → activate → POST to:');
console.log('  https://<n8n-host>/webhook/content-test');
