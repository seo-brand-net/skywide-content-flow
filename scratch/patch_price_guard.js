/**
 * Patch: Add price/cost figure guard to Claude Draft anti-hallucination protocol
 *
 * PROBLEM: Claude Draft is inventing specific dollar amounts and price ranges
 * that don't exist in the brief or client profile.
 * e.g. $75-150, $225-450, $250-400, $750-1200 — none instructed.
 *
 * FIX: Add an explicit rule inside the existing ANTI-HALLUCINATION PROTOCOL
 * in parameters.text to block uninstructed price figures.
 */

const https = require('https');
const fs    = require('fs');

const N8N_HOST   = 'seobrand.app.n8n.cloud';
const N8N_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const WORKFLOW_ID = 't3LNiuZIghvobde3';

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: N8N_HOST, path, method,
      headers: {
        'X-N8N-API-KEY': N8N_KEY, 'Accept': 'application/json', 'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };
    const req = https.request(options, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Injected into the existing ANTI-HALLUCINATION PROTOCOL block,
// right before the next heading that follows it.
const PRICE_GUARD = `
RULE — NO UNINSTRUCTED PRICE FIGURES:
  Do NOT introduce any specific dollar amounts, price ranges, or cost figures
  that are not explicitly provided in the CREATIVE BRIEF or VERIFIED UNIQUE CLAIMS above.

  ✅ ALLOWED: Prices explicitly stated in the brief (e.g. "grinding costs $75-400")
  ✅ ALLOWED: DIY rental costs if in the brief (e.g. "$100-250/day at Home Depot")
  ❌ FORBIDDEN: Any price range you calculate, estimate, or infer
     e.g. "$75-150 for small stumps" / "$225-450 for medium" / "$750-1200 for removal"
  ❌ FORBIDDEN: Regional market rates, competitor prices, or cost brackets you generate

  If cost context is needed beyond what the brief provides, express it qualitatively:
  "Removal generally costs more than grinding" — NOT "$X–$Y more."

`;

async function main() {
  console.log('Fetching workflow...');
  const wf = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (!wf.nodes) { console.error('Fetch failed'); process.exit(1); }
  fs.writeFileSync('scratch/workflow_backup_pre_price_guard.json', JSON.stringify(wf, null, 2));
  console.log('Nodes:', wf.nodes.length);

  const draftNode = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
  if (!draftNode) { console.error('Draft node not found'); process.exit(1); }

  const draftText = draftNode.parameters?.text || '';

  if (draftText.includes('NO UNINSTRUCTED PRICE FIGURES')) {
    console.log('Price guard already present, nothing to do.');
    return;
  }

  // Inject inside the existing anti-hallucination protocol block,
  // just before the next section heading after it
  const PROTOCOL_ANCHOR = '# ⛔ ANTI-HALLUCINATION PROTOCOL (NON-NEGOTIABLE)';

  if (!draftText.includes(PROTOCOL_ANCHOR)) {
    console.error('Anti-hallucination protocol block not found in draft prompt');
    process.exit(1);
  }

  const protocolIdx = draftText.indexOf(PROTOCOL_ANCHOR);
  // Inject just before the CLAIMS MANIFEST section that follows the protocol
  const CLOSE_ANCHOR = '## CLAIMS MANIFEST';
  const claimsIdx = draftText.indexOf(CLOSE_ANCHOR, protocolIdx);

  if (claimsIdx === -1) {
    // Fallback: inject at end of protocol block before next blank line + heading
    const afterProtocol = draftText.substring(protocolIdx + PROTOCOL_ANCHOR.length);
    const nextHeading = afterProtocol.match(/\n#{1,2} [^\n]+/);
    if (!nextHeading) { console.error('Could not find any closing heading'); process.exit(1); }
    const insertIdx = protocolIdx + PROTOCOL_ANCHOR.length + nextHeading.index;
    draftNode.parameters.text = draftText.substring(0, insertIdx) + '\n' + PRICE_GUARD + draftText.substring(insertIdx);
  } else {
    draftNode.parameters.text = draftText.substring(0, claimsIdx) + PRICE_GUARD + draftText.substring(claimsIdx);
  }

  console.log('✅ Draft: price guard injected into anti-hallucination protocol block');

  // Push
  console.log('\nPushing patch...');
  const payload = {
    name: wf.name, nodes: wf.nodes,
    connections: wf.connections, settings: wf.settings,
    staticData: wf.staticData || null
  };

  const result = await apiRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);
  if (result.id || result.name) {
    console.log('✅ Saved:', result.name);
    const live = result.nodes?.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
    const ok   = live?.parameters?.text?.includes('NO UNINSTRUCTED PRICE FIGURES');
    console.log('\n── VERIFICATION ──');
    console.log('Price guard in draft prompt:', ok ? '✅ CONFIRMED' : '❌ NOT FOUND');
  } else {
    console.error('❌ Save failed:', JSON.stringify(result).substring(0, 300));
  }
}

main().catch(console.error);
