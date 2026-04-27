/**
 * duplicate_for_test.js
 * ---------------------
 * Duplicates "DEV Skywide  Content.json" into "TEST Skywide  Content.json"
 * with all environment-specific values swapped for testing:
 *
 *  1. Workflow name  → "TEST Skywide Content"
 *  2. Webhook path   → "content-engine-test"   (was "content-engine-dev")
 *  3. Dashboard URLs → /api/webhooks/test-*     (was /api/webhooks/n8n-*)
 *  4. Google Drive parent folder ID             (hardcoded DEV → TEST, see below)
 *  5. Strips any pinData (test should run live, not off pinned data)
 *  6. Generates fresh UUIDs for every node so there is zero collision with DEV
 *
 * Run:  node duplicate_for_test.js
 */

const fs   = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const INPUT_FILE  = 'DEV Skywide  Content.json';
const OUTPUT_FILE = 'TEST Skywide  Content.json';

// Webhook path — the test workflow gets its own path so they can both be active
const DEV_WEBHOOK_PATH  = 'content-engine-dev';
const TEST_WEBHOOK_PATH = 'content-engine-test';

// Dashboard callback URL replacements
// Map:  old URL fragment  →  new URL fragment
const URL_REPLACEMENTS = [
  { from: '/api/webhooks/n8n-drive-url', to: '/api/webhooks/test-drive-url' },
  { from: '/api/webhooks/n8n-error',     to: '/api/webhooks/test-error'     },
  { from: '/api/webhooks/n8n-start',     to: '/api/webhooks/test-start'     },
  { from: '/api/webhooks/n8n-complete',  to: '/api/webhooks/test-complete'  },
];

// Google Drive parent folder
// DEV uses folder ID: 1h7-ILBh46Ir9_dezJa8sSBEN7bdNp7Dj  (Skywide)
// Set TEST_FOLDER_ID to a different Drive folder if you want test docs isolated.
// Leave as null to keep using the same Drive folder (docs will still be created
// under a sub-folder named after the job title, so they won't collide).
const DEV_FOLDER_ID  = '1h7-ILBh46Ir9_dezJa8sSBEN7bdNp7Dj';
const TEST_FOLDER_ID = null; // ← set to a new folder ID if you have one

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Deep-walk any JSON value and apply a string transform to every string leaf.
 */
function deepMapStrings(value, fn) {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value))      return value.map(v => deepMapStrings(v, fn));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepMapStrings(v, fn);
    }
    return out;
  }
  return value;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

console.log(`Reading: ${INPUT_FILE}`);
const raw = fs.readFileSync(INPUT_FILE, 'utf8');
let wf    = JSON.parse(raw);

// 1. Generate a UUID map: old node id → new node id
//    n8n uses node `id` fields for internal connection wiring.
const idMap = {};
wf.nodes.forEach(n => {
  if (n.id) idMap[n.id] = randomUUID();
});

// 2. Remap node IDs
wf.nodes = wf.nodes.map(n => {
  if (n.id && idMap[n.id]) n.id = idMap[n.id];
  return n;
});

// 3. Remap connection keys (n8n connections use node names, not IDs — safe)
//    Nothing to do here for names.

// 4. Apply all string-level replacements globally across the workflow
wf = deepMapStrings(wf, str => {
  let s = str;

  // 4a. Webhook path
  s = s.replace(new RegExp(DEV_WEBHOOK_PATH, 'g'), TEST_WEBHOOK_PATH);

  // 4b. Dashboard URLs
  for (const { from, to } of URL_REPLACEMENTS) {
    s = s.replaceAll(from, to);
  }

  // 4c. Google Drive folder (only if a TEST folder is configured)
  if (TEST_FOLDER_ID && s.includes(DEV_FOLDER_ID)) {
    s = s.replaceAll(DEV_FOLDER_ID, TEST_FOLDER_ID);
  }

  return s;
});

// 5. Update the cachedResultName on the Drive folder node so it
//    shows "Skywide TEST" in the n8n UI instead of "Skywide"
wf.nodes = wf.nodes.map(n => {
  if (n.name === 'Create folder1' && n.parameters?.folderId?.cachedResultName) {
    n.parameters.folderId.cachedResultName = TEST_FOLDER_ID
      ? 'Skywide TEST'
      : n.parameters.folderId.cachedResultName + ' (TEST)';
  }
  return n;
});

// 6. Strip pinData so the test run hits the LLMs live
wf.pinData = {};

// 7. Set workflow name
wf.name = 'TEST Skywide Content';

// 8. Mark as inactive by default — import, review, then activate manually
wf.active = false;

// 9. Write output
const output = JSON.stringify(wf, null, 2);
fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

console.log('');
console.log('✅  Done! Created:', OUTPUT_FILE);
console.log('');
console.log('Changes applied:');
console.log(`  • Workflow name      : "TEST Skywide Content"`);
console.log(`  • Webhook path       : ${DEV_WEBHOOK_PATH} → ${TEST_WEBHOOK_PATH}`);
console.log(`  • Dashboard webhooks : /api/webhooks/n8n-* → /api/webhooks/test-*`);
if (TEST_FOLDER_ID) {
  console.log(`  • Drive folder ID    : ${DEV_FOLDER_ID} → ${TEST_FOLDER_ID}`);
} else {
  console.log(`  • Drive folder ID    : unchanged (same Skywide folder, sub-folder per job)`);
}
console.log(`  • Pin data           : cleared`);
console.log(`  • Node UUIDs         : regenerated (${Object.keys(idMap).length} nodes)`);
console.log(`  • Active             : false (activate manually after import)`);
console.log('');
console.log('Next steps:');
console.log('  1. Open n8n → Import workflow → select TEST Skywide  Content.json');
console.log('  2. Review credentials (should inherit from DEV — same credential names)');
console.log('  3. Activate the TEST workflow');
console.log('  4. Send a test POST to:');
console.log(`       https://<your-n8n-host>/webhook/${TEST_WEBHOOK_PATH}`);
console.log('     with the same JSON body structure you use for DEV.');
console.log('');
console.log('To wire the Skywide dashboard to TEST, add these env vars:');
console.log('  N8N_TEST_WEBHOOK_URL=https://<your-n8n-host>/webhook/content-engine-test');
console.log('  (or use the existing NEXT_PUBLIC_N8N_WEBHOOK_URL for quick local testing)');
