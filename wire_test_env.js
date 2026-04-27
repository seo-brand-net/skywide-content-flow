/**
 * wire_test_env.js
 * ----------------
 * Takes "TEST Skywide  Content.json" (our DEV duplicate) and applies
 * the same test-environment wiring used in "Dev Testing Workflow (4).json":
 *
 * CHANGES APPLIED:
 *  1. Webhook path  →  content-engine-dev-test-unique
 *  2. Google Drive Notification1 → posts to /api/test-callback (not /api/webhooks/test-drive-url)
 *  3. Startup Update, Send Error to Dashboard urls → /api/test-callback
 *  4. Signal Completion → /api/test-callback
 *  5. Google Docs write nodes removed (15, 6, 16 variants) — test doesn't write final docs
 *  6. 5 test-only nodes injected:
 *       - Model Branch (if node after Merge7)
 *       - Respond to Test Webhook
 *       - Test Quality Audit (OpenAI brief-consistency validator)
 *       - Send Test Callback (posts audit result to /api/test-callback)
 *       - On Flow Error → Format Failure Result → Send Failure Callback
 *  7. Connections rewired: Merge7 → Model Branch → (Wait6 | Wait7)
 *  8. pinData copied over from Dev Testing Workflow (4).json (same set)
 *  9. settings.executionOrder = "v1"
 * 10. Workflow name  → "TEST Skywide Content (Prompt Review)"
 */

const fs = require('fs');
const { randomUUID } = require('crypto');

const INPUT_FILE    = 'TEST Skywide  Content.json';
const REFERENCE_FILE= 'Dev Testing Workflow (4).json';
const OUTPUT_FILE   = 'TEST Skywide Content (Prompt Review).json';

// ─── READ FILES ───────────────────────────────────────────────────────────────
console.log('Reading files...');
let wf  = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
const ref = JSON.parse(fs.readFileSync(REFERENCE_FILE, 'utf8'));

// ─── 1. WEBHOOK PATH ─────────────────────────────────────────────────────────
const whNode = wf.nodes.find(n => n.name === 'Webhook1');
whNode.parameters.path = 'content-engine-dev-test-unique';
whNode.parameters.responseMode = 'responseNode'; // needed because Respond to Test Webhook handles it
console.log('✓ Webhook path → content-engine-dev-test-unique');

// ─── 2. ALL HTTP CALLBACK URLS → /api/test-callback ──────────────────────────
// Google Drive Notification1 — copy full params from reference
const refGDN = ref.nodes.find(n => n.name === 'Google Drive Notification1');
const ourGDN = wf.nodes.find(n => n.name === 'Google Drive Notification1');
ourGDN.parameters = JSON.parse(JSON.stringify(refGDN.parameters));
console.log('✓ Google Drive Notification1 → /api/test-callback');

// Startup Update → /api/test-callback simple POST
const startupNode = wf.nodes.find(n => n.name === 'Startup Update');
if (startupNode) {
  startupNode.parameters.url = 'https://skywide-content-flow.vercel.app/api/test-callback';
  console.log('✓ Startup Update → /api/test-callback');
}

// Send Error to Dashboard → /api/test-callback
const errDash = wf.nodes.find(n => n.name === 'Send Error to Dashboard');
if (errDash) {
  errDash.parameters.url = 'https://skywide-content-flow.vercel.app/api/test-callback';
  console.log('✓ Send Error to Dashboard → /api/test-callback');
}

// Signal Completion → /api/test-callback
const sigComp = wf.nodes.find(n => n.name === 'Signal Completion (Update a document17)');
if (sigComp) {
  sigComp.parameters.url = 'https://skywide-content-flow.vercel.app/api/test-callback';
  console.log('✓ Signal Completion → /api/test-callback');
}

// ─── 3. REMOVE GOOGLE DOCS WRITE NODES (not needed in test) ──────────────────
const removeNodes = [
  'Create a document15', 'Update a document15',
  'Create a document6',
  'Create a document16', 'Update a document16',
];
const beforeCount = wf.nodes.length;
wf.nodes = wf.nodes.filter(n => !removeNodes.includes(n.name));
// Also remove their connections
removeNodes.forEach(name => {
  delete wf.connections[name];
  // Remove any connections pointing TO these nodes
  Object.keys(wf.connections).forEach(from => {
    const conn = wf.connections[from];
    if (conn && Array.isArray(conn.main)) {
      conn.main = conn.main.map(port =>
        Array.isArray(port) ? port.filter(c => c.node !== name) : port
      );
    }
  });
});
console.log(`✓ Removed ${beforeCount - wf.nodes.length} Google Docs write nodes`);

// ─── 4. COPY TEST-ONLY NODES FROM REFERENCE ───────────────────────────────────
const testOnlyNodeNames = [
  'Respond to Test Webhook',
  'Test Quality Audit',
  'Model Branch',
  'Send Test Callback',
  'On Flow Error',
  'Format Failure Result',
  'Send Failure Callback',
];

testOnlyNodeNames.forEach(name => {
  // Remove if already exists (from our earlier duplicate run)
  wf.nodes = wf.nodes.filter(n => n.name !== name);

  const refNode = ref.nodes.find(n => n.name === name);
  if (!refNode) {
    console.warn('  ⚠ Reference node not found:', name);
    return;
  }
  // Deep clone and give a fresh UUID
  const cloned = JSON.parse(JSON.stringify(refNode));
  cloned.id = randomUUID();
  wf.nodes.push(cloned);
  console.log('✓ Injected node:', name);
});

// ─── 5. REWIRE CONNECTIONS ────────────────────────────────────────────────────
// Copy all connections involving test nodes from reference
testOnlyNodeNames.forEach(name => {
  if (ref.connections[name]) {
    wf.connections[name] = JSON.parse(JSON.stringify(ref.connections[name]));
  }
});

// Merge7 → Model Branch (overwrite Merge7's existing connections)
wf.connections['Merge7'] = {
  main: [[{ node: 'Model Branch', type: 'main', index: 0 }]]
};

// Model Branch → Wait6 (true/openai branch) | Wait7 (false/claude branch)
// These are already set in ref.connections['Model Branch'] — already copied above.

// Test Quality Audit feeds from: all Document Export Sanitization QA outputs
// (same as reference — these connections come from 80+? and Check Max Iterations nodes)
// Copy those specific connections from reference
const qaFeeders = [
  '80 +?4', 'Check Max Iterations2',
  '80 +?6', 'Check Max Iterations3',
  'Document Export Sanitization3','Document Export Sanitization4',
  'Document Export Sanitization6','Document Export Sanitization7',
];
qaFeeders.forEach(feederName => {
  if (ref.connections[feederName]) {
    wf.connections[feederName] = JSON.parse(JSON.stringify(ref.connections[feederName]));
    console.log('✓ Rewired feeder:', feederName, '→ Test Quality Audit');
  }
});

console.log('✓ Connections rewired');

// ─── 6. COPY PINDATA FROM REFERENCE ──────────────────────────────────────────
wf.pinData = JSON.parse(JSON.stringify(ref.pinData || {}));
console.log(`✓ Copied pinData (${Object.keys(wf.pinData).length} pinned nodes)`);

// ─── 7. SETTINGS ─────────────────────────────────────────────────────────────
wf.settings = { executionOrder: 'v1' };
console.log('✓ Set executionOrder: v1');

// ─── 8. WORKFLOW META ─────────────────────────────────────────────────────────
wf.name      = 'TEST Skywide Content (Prompt Review)';
wf.active    = false;
wf.versionId = randomUUID();
wf.id        = randomUUID().replace(/-/g, '').substring(0, 16);
wf.tags      = ref.tags ? JSON.parse(JSON.stringify(ref.tags)) : [];

// ─── 9. ENFORCE KEY ORDER (must match native n8n export format) ───────────────
const ordered = {
  name:        wf.name,
  nodes:       wf.nodes,
  pinData:     wf.pinData,
  connections: wf.connections,
  active:      wf.active,
  settings:    wf.settings,
  versionId:   wf.versionId,
  meta:        wf.meta,
  id:          wf.id,
  tags:        wf.tags,
};

// ─── 10. WRITE OUTPUT ─────────────────────────────────────────────────────────
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(ordered, null, 2), 'utf8');

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
console.log('');
console.log('✅  Done! Created:', OUTPUT_FILE);
console.log('');
console.log('Test environment wiring:');
console.log('  • Webhook path          : content-engine-dev-test-unique');
console.log('  • All callbacks         : /api/test-callback');
console.log('  • Google Docs writes    : removed (5 nodes)');
console.log('  • Test nodes injected   : Model Branch, Respond to Test Webhook,');
console.log('                            Test Quality Audit, Send Test Callback,');
console.log('                            On Flow Error, Format Failure Result,');
console.log('                            Send Failure Callback');
console.log('  • Merge7                : → Model Branch');
console.log('  • QA feeders rewired    : → Test Quality Audit');
console.log('  • pinData               : copied from Dev Testing Workflow (4)');
console.log('  • Workflow name         : TEST Skywide Content (Prompt Review)');
console.log('  • Active                : false (activate manually after import)');
console.log('');
console.log('Import: Open n8n → Import → select', OUTPUT_FILE);
console.log('Test:   POST https://<n8n-host>/webhook/content-engine-dev-test-unique');
