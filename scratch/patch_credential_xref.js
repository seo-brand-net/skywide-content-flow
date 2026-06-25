/**
 * Patch: Credential Cross-Reference across Claims Extractor, AI Agent, Surgical Rewriter
 *
 * PROBLEM: Claims Extractor marks brief-stated credentials as source:"Brief" but has no
 * credential_warnings field. AI Agent enforces them as required claims. Surgical Rewriter
 * injects them into the final article even when they're not on the client website.
 *
 * FIX:
 *   1. Claims Extractor → Add Rule 5 + credential_warnings to output schema
 *   2. AI Agent          → Skip required_claims that are in credential_warnings
 *   3. Surgical Rewriter → Process credential_warnings FIRST, before AI Agent fixes
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
        'X-N8N-API-KEY': N8N_KEY,
        'Accept':        'application/json',
        'Content-Type':  'application/json',
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

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1 — Claims Extractor: Rule 5 + credential_warnings in schema
// Appended after Rule 4 in the existing prompt
// ─────────────────────────────────────────────────────────────────────────────
const CLAIMS_RULE5 = `
5. Credential Cross-Reference: Extract every certification, accreditation, or credential claim mentioned in the Brief (e.g. "ISA-certified arborists", "TCIA credentials", "BBB Accredited", "licensed contractor", "EPA certified").
   Compare each against the Verified Client Profile's "credentials" array.
   - If the credential IS in the verified profile → include it in claims as normal with source:"Verified".
   - If the credential is NOT in the verified profile → add it to "credential_warnings" with the action "REMOVE or REPLACE" and list the actual verified credential as the replacement.
   - If the brief mentions a credential standard (e.g. "per TCIA standards") but not company membership → it is a STYLE reference, not a company credential. Do NOT add to credential_warnings.
`;

// New schema entry to append to the output JSON schema block
const CLAIMS_SCHEMA_ADDITION = `"credential_warnings": [
    {
      "claim": "exact credential phrase from brief",
      "source": "Brief",
      "reason": "Not listed in verified client credentials. Verified credential is: [actual credential from profile]",
      "action": "REMOVE or REPLACE",
      "replacement": "exact verified credential phrase, or empty string if none applies"
    }
  ]`;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 2 — AI Agent: skip required_claims that appear in credential_warnings
// ─────────────────────────────────────────────────────────────────────────────
const AGENT_CREDENTIAL_BLOCK = `
# Credential Warning Override
Before running the Claims Check, read the credential_warnings from the Claims Extractor:
{{ $('Claims Extractor & Manifest Generator').first().json.credential_warnings 
   ? JSON.stringify($('Claims Extractor & Manifest Generator').first().json.credential_warnings) 
   : '[]' }}

Any required_claim that matches a claim listed in credential_warnings must be SKIPPED during the Claims Check — do not flag its absence as a validation failure. These claims have been flagged as unverified against the client's website and will be handled separately.

`;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 3 — Surgical Rewriter: process credential_warnings BEFORE AI Agent fixes
// ─────────────────────────────────────────────────────────────────────────────
const SURGICAL_CREDENTIAL_BLOCK = `CREDENTIAL WARNINGS — Process these FIRST before any other corrections:
{{ $('Claims Extractor & Manifest Generator').first().json.credential_warnings && $('Claims Extractor & Manifest Generator').first().json.credential_warnings.length > 0 
   ? JSON.stringify($('Claims Extractor & Manifest Generator').first().json.credential_warnings) 
   : 'none' }}

For each credential warning:
- Find EVERY instance of the flagged "claim" phrase in the article (exact match or close paraphrase)
- If "replacement" is provided and non-empty → replace the flagged phrase with the replacement
- If "replacement" is empty → remove the sentence or clause containing the flagged phrase entirely
- IMPORTANT: These credential removals take precedence over any AI Agent validation issues that ask you to add the same credential back

`;

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching live workflow...');
  const wf = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (!wf.nodes) { console.error('Fetch failed:', JSON.stringify(wf).substring(0, 200)); process.exit(1); }
  console.log('Nodes:', wf.nodes.length);
  fs.writeFileSync('scratch/workflow_backup_pre_cred_patch.json', JSON.stringify(wf, null, 2));
  console.log('Backup saved.');

  let patchCount = 0;

  // ── PATCH 1: Claims Extractor ─────────────────────────────────────────────
  const claimsNode = wf.nodes.find(n => n.name === 'Claims Extractor & Manifest Generator');
  if (!claimsNode) { console.error('Claims node not found'); process.exit(1); }

  const claimsText = claimsNode.parameters?.text || '';
  if (claimsText.includes('Credential Cross-Reference')) {
    console.log('Claims Extractor: Rule 5 already present, skipping');
  } else {
    // Append Rule 5 before the "Output STRICTLY" line
    const anchor = 'Output STRICTLY in the provided JSON schema.';
    if (claimsText.includes(anchor)) {
      let patched = claimsText.replace(anchor, CLAIMS_RULE5 + '\n' + anchor);

      // Also extend the JSON schema hint — find the closing bracket of the schema
      // The schema is described inline; add credential_warnings field before the closing
      // Look for the hasOutputParser flag which means there's a structured schema
      // Since we can't modify the output parser directly, we'll add it to the prompt instruction
      const schemaHint = 'Output STRICTLY in the provided JSON schema.';
      patched = patched.replace(
        schemaHint,
        schemaHint + '\nEnsure the output JSON includes the "credential_warnings" array even if it is empty: []'
      );

      claimsNode.parameters.text = patched;
      console.log('✅ Claims Extractor: Rule 5 + credential_warnings schema instruction added');
      patchCount++;
    } else {
      // Fallback: append at end
      claimsNode.parameters.text = claimsText + '\n' + CLAIMS_RULE5;
      console.log('✅ Claims Extractor: Rule 5 appended (fallback — no anchor found)');
      patchCount++;
    }
  }

  // ── PATCH 2: AI Agent ─────────────────────────────────────────────────────
  const agentNode = wf.nodes.find(n => n.name === 'AI Agent1');
  if (!agentNode) { console.error('AI Agent node not found'); process.exit(1); }

  const agentText = agentNode.parameters?.text || '';
  if (agentText.includes('Credential Warning Override')) {
    console.log('AI Agent: credential override already present, skipping');
  } else {
    // Inject before the "# Validation Criteria" section
    const agentAnchor = '# Validation Criteria';
    if (agentText.includes(agentAnchor)) {
      agentNode.parameters.text = agentText.replace(agentAnchor, AGENT_CREDENTIAL_BLOCK + agentAnchor);
      console.log('✅ AI Agent: credential override injected before Validation Criteria');
      patchCount++;
    } else {
      // Fallback: inject before Output Instructions
      const fallback = '# Output Instructions';
      if (agentText.includes(fallback)) {
        agentNode.parameters.text = agentText.replace(fallback, AGENT_CREDENTIAL_BLOCK + fallback);
        console.log('✅ AI Agent: credential override injected (fallback anchor)');
        patchCount++;
      } else {
        console.warn('⚠️  AI Agent: no anchor found, skipping');
      }
    }
  }

  // ── PATCH 3: Surgical Rewriter ────────────────────────────────────────────
  // The surgical rewriter uses parameters.messages.values[0].content (not .text)
  const surgNode = wf.nodes.find(n => n.name === 'Surgical Rewriter');
  if (!surgNode) { console.error('Surgical Rewriter not found'); process.exit(1); }

  // Find the right field - it's in messages.values[0].content based on earlier inspection
  const surgParams = surgNode.parameters || {};
  let surgText = '';
  let surgField = null;
  let surgPath  = null;

  if (typeof surgParams.text === 'string' && surgParams.text.length > 100) {
    surgText  = surgParams.text;
    surgField = 'text';
  } else if (surgParams.messages?.values?.[0]?.content) {
    surgText  = surgParams.messages.values[0].content;
    surgField = 'messages.values[0].content';
    surgPath  = ['messages', 'values', 0, 'content'];
  } else if (surgParams.messages?.values?.[0]?.message) {
    surgText  = surgParams.messages.values[0].message;
    surgField = 'messages.values[0].message';
    surgPath  = ['messages', 'values', 0, 'message'];
  } else {
    // Serialize and search
    const str = JSON.stringify(surgParams);
    if (str.includes('CORRECTIONS NEEDED')) {
      console.log('Surgical Rewriter param structure (first 300):', str.substring(0, 300));
      console.warn('⚠️  Surgical Rewriter: non-standard structure, manual inspection needed');
    }
  }

  console.log('Surgical Rewriter field:', surgField, '| Length:', surgText.length);

  if (surgText.includes('CREDENTIAL WARNINGS')) {
    console.log('Surgical Rewriter: credential block already present, skipping');
  } else if (surgText.length > 0) {
    const surgAnchor = 'CORRECTIONS NEEDED:';
    if (surgText.includes(surgAnchor)) {
      const patched = surgText.replace(surgAnchor, SURGICAL_CREDENTIAL_BLOCK + surgAnchor);
      if (surgField === 'text') {
        surgNode.parameters.text = patched;
      } else if (surgPath) {
        let obj = surgNode.parameters;
        for (let i = 0; i < surgPath.length - 1; i++) obj = obj[surgPath[i]];
        obj[surgPath[surgPath.length - 1]] = patched;
      }
      console.log('✅ Surgical Rewriter: credential_warnings block injected before CORRECTIONS NEEDED');
      patchCount++;
    } else {
      console.warn('⚠️  Surgical Rewriter: CORRECTIONS NEEDED anchor not found');
    }
  } else {
    console.warn('⚠️  Surgical Rewriter: could not locate prompt text');
  }

  if (patchCount === 0) {
    console.log('No patches needed.');
    return;
  }

  // ── Push ──────────────────────────────────────────────────────────────────
  console.log(`\nPushing ${patchCount} patch(es) to n8n...`);
  const payload = {
    name: wf.name, nodes: wf.nodes,
    connections: wf.connections, settings: wf.settings,
    staticData: wf.staticData || null
  };

  const result = await apiRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);
  if (result.id || result.name) {
    console.log('✅ Workflow saved:', result.name || result.id);

    const claimsLive  = result.nodes?.find(n => n.name === 'Claims Extractor & Manifest Generator');
    const agentLive   = result.nodes?.find(n => n.name === 'AI Agent1');
    const surgLive    = result.nodes?.find(n => n.name === 'Surgical Rewriter');

    const claimsOk = claimsLive?.parameters?.text?.includes('Credential Cross-Reference');
    const agentOk  = agentLive?.parameters?.text?.includes('Credential Warning Override');
    const surgStr  = JSON.stringify(surgLive?.parameters || '');
    const surgOk   = surgStr.includes('CREDENTIAL WARNINGS');

    console.log('\n── VERIFICATION ──');
    console.log('Claims Extractor Rule 5:  ', claimsOk ? '✅ CONFIRMED' : '❌ NOT FOUND');
    console.log('AI Agent override:         ', agentOk  ? '✅ CONFIRMED' : '❌ NOT FOUND');
    console.log('Surgical Rewriter block:   ', surgOk   ? '✅ CONFIRMED' : '❌ NOT FOUND');
  } else {
    console.error('❌ Save failed:', JSON.stringify(result).substring(0, 400));
  }
}

main().catch(console.error);
