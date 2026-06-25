/**
 * Patch v2: Fix credential_warnings field name consistency + enforce replacement value
 *
 * PROBLEM from exec 3033:
 *  - Claims Extractor used "credential" key instead of "claim" in credential_warnings
 *  - Replacement was "None" instead of verified credential from client profile
 *  - Surgical Rewriter template reads .claim so the warning was skipped
 *
 * FIX:
 *  1. Claims Extractor — tighten schema to enforce exact field names + require replacement
 *  2. Surgical Rewriter — update expression to handle both "claim" and "credential" keys
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

async function main() {
  const wf = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (!wf.nodes) { console.error('Fetch failed'); process.exit(1); }
  console.log('Fetched. Nodes:', wf.nodes.length);
  fs.writeFileSync('scratch/workflow_backup_pre_cred_patch_v2.json', JSON.stringify(wf, null, 2));

  let patchCount = 0;

  // ── PATCH 1: Claims Extractor — enforce exact schema + require verified replacement ──
  const claimsNode = wf.nodes.find(n => n.name === 'Claims Extractor & Manifest Generator');
  const claimsText = claimsNode?.parameters?.text || '';

  // Replace the existing Rule 5 with a tighter version
  const OLD_RULE5_ANCHOR = '5. Credential Cross-Reference:';
  const NEW_RULE5 = `5. Credential Cross-Reference: Extract every certification, accreditation, or credential claim mentioned in the Brief (e.g. "ISA-certified arborists", "TCIA credentials", "BBB Accredited", "licensed contractor", "EPA certified").
   Compare each against the Verified Client Profile's "credentials" array.
   - If the credential IS in the verified profile → include in claims with source:"Verified".
   - If the credential is NOT in the verified profile → add to "credential_warnings".
   - If the brief mentions a credential STANDARD (e.g. "per TCIA standards") but NOT company membership → it is a style reference only. Do NOT add to credential_warnings.

   CRITICAL — credential_warnings schema: use EXACTLY these field names:
   {
     "claim": "<exact credential phrase from brief>",
     "source": "Brief",
     "reason": "Not listed in verified client credentials.",
     "action": "REMOVE or REPLACE",
     "replacement": "<use the verified credential from the client profile, e.g. 'Fully Licensed And Insured'. If no replacement applies, use empty string>"
   }
   The "replacement" field MUST contain the actual verified credential string, never the word "None".
`;

  if (claimsText.includes(OLD_RULE5_ANCHOR)) {
    // Find and replace the old Rule 5 block up to the next blank line + "Output STRICTLY"
    const startIdx = claimsText.indexOf(OLD_RULE5_ANCHOR);
    // Find the end of Rule 5 — it ends at "Output STRICTLY" which comes after
    const endAnchor = 'Output STRICTLY in the provided JSON schema.';
    const endIdx = claimsText.indexOf(endAnchor, startIdx);
    if (endIdx > startIdx) {
      const before = claimsText.substring(0, startIdx);
      const after  = claimsText.substring(endIdx);
      claimsNode.parameters.text = before + NEW_RULE5 + '\n' + after;
      console.log('✅ Claims Extractor: Rule 5 replaced with tighter version');
      patchCount++;
    } else {
      console.warn('⚠️  Claims Extractor: could not find end boundary for Rule 5 replacement');
    }
  } else {
    console.log('Claims Extractor: original Rule 5 anchor not found — may already be updated or uses different text');
  }

  // ── PATCH 2: Surgical Rewriter — handle both "claim" and "credential" key names ──
  const surgNode = wf.nodes.find(n => n.name === 'Surgical Rewriter');
  const surgParams = surgNode?.parameters || {};

  // Find the content field — from exec3033 we know it's messages.values[0].content
  let surgText = '';
  let surgSetter = null;

  if (typeof surgParams.text === 'string' && surgParams.text.includes('CREDENTIAL WARNINGS')) {
    surgText = surgParams.text;
    surgSetter = (val) => { surgNode.parameters.text = val; };
  } else if (surgParams.messages?.values?.[0]?.content?.includes('CREDENTIAL WARNINGS')) {
    surgText = surgParams.messages.values[0].content;
    surgSetter = (val) => { surgNode.parameters.messages.values[0].content = val; };
  }

  if (surgText && surgSetter) {
    // The current n8n expression reads .claim — update to normalise both field names
    const OLD_CRED_BLOCK = `CREDENTIAL WARNINGS — Process these FIRST before any other corrections:
{{ $('Claims Extractor & Manifest Generator').first().json.credential_warnings && $('Claims Extractor & Manifest Generator').first().json.credential_warnings.length > 0 
   ? JSON.stringify($('Claims Extractor & Manifest Generator').first().json.credential_warnings) 
   : 'none' }}

For each credential warning:
- Find EVERY instance of the flagged "claim" phrase in the article (exact match or close paraphrase)
- If "replacement" is provided and non-empty → replace the flagged phrase with the replacement
- If "replacement" is empty → remove the sentence or clause containing the flagged phrase entirely
- IMPORTANT: These credential removals take precedence over any AI Agent validation issues that ask you to add the same credential back`;

    const NEW_CRED_BLOCK = `CREDENTIAL WARNINGS — Process these FIRST before any other corrections:
{{ (() => { const w = $('Claims Extractor & Manifest Generator').first().json.credential_warnings; return (w && w.length > 0) ? JSON.stringify(w) : 'none'; })() }}

For each item in the credential_warnings array (field may be named "claim" OR "credential"):
- The flagged phrase is the value of the "claim" or "credential" field
- Find EVERY instance of that phrase in the article (exact match or close paraphrase including plurals/variants)
- If "replacement" is a non-empty string → replace the flagged phrase with the replacement value
- If "replacement" is empty, null, or "None" → use the client's verified credential instead: "Fully Licensed And Insured"
- Remove any redundant sentence fragments left after substitution
- IMPORTANT: These credential substitutions take PRECEDENCE over any AI Agent validation issues requesting the same credential be added back`;

    if (surgText.includes(OLD_CRED_BLOCK)) {
      surgSetter(surgText.replace(OLD_CRED_BLOCK, NEW_CRED_BLOCK));
      console.log('✅ Surgical Rewriter: credential block updated with dual field name support + fallback replacement');
      patchCount++;
    } else {
      // The block text may have minor differences — try key substring
      if (surgText.includes('flagged "claim" phrase')) {
        const updated = surgText
          .replace('flagged "claim" phrase', 'flagged phrase (check "claim" or "credential" field name)')
          .replace(
            'If "replacement" is provided and non-empty → replace the flagged phrase with the replacement',
            'If "replacement" is a non-empty string and not "None" → replace the flagged phrase with replacement; otherwise use "Fully Licensed And Insured"'
          );
        surgSetter(updated);
        console.log('✅ Surgical Rewriter: credential block updated (partial patch)');
        patchCount++;
      } else {
        console.warn('⚠️  Surgical Rewriter: credential block not found in expected location');
        console.log('  First 300 of surgText:', surgText.substring(0, 300));
      }
    }
  } else {
    console.warn('⚠️  Surgical Rewriter: CREDENTIAL WARNINGS block not found in any field');
  }

  if (patchCount === 0) { console.log('No patches applied.'); return; }

  console.log(`\nPushing ${patchCount} patch(es)...`);
  const payload = {
    name: wf.name, nodes: wf.nodes,
    connections: wf.connections, settings: wf.settings,
    staticData: wf.staticData || null
  };

  const result = await apiRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);
  if (result.id || result.name) {
    console.log('✅ Saved:', result.name);
    const claimsLive = result.nodes?.find(n => n.name === 'Claims Extractor & Manifest Generator');
    const surgLive   = result.nodes?.find(n => n.name === 'Surgical Rewriter');
    const surgStr    = JSON.stringify(surgLive?.parameters || {});

    console.log('\n── VERIFICATION ──');
    console.log('Claims Rule 5 (tighter):   ', claimsLive?.parameters?.text?.includes('MUST contain the actual verified credential') || claimsLive?.parameters?.text?.includes('never the word "None"') ? '✅' : '⚠️  check manually');
    console.log('Surgical dual-field:       ', surgStr.includes('claim" OR "credential') || surgStr.includes('claim" or "credential') ? '✅' : '⚠️  check manually');
    console.log('Surgical fallback replace:  ', surgStr.includes('Fully Licensed And Insured') ? '✅' : '❌');
  } else {
    console.error('❌ Save failed:', JSON.stringify(result).substring(0, 300));
  }
}

main().catch(console.error);
