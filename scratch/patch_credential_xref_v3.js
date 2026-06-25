/**
 * Patch v3: Fix Claims Extractor expression parsing in AI Agent + Surgical Rewriter
 *
 * ROOT CAUSE: Claims Extractor outputs { "text": "```json\n{...}\n```" }
 * Both nodes try $(...).first().json.credential_warnings → gets undefined
 * because credential_warnings is embedded inside the .text string, not a top-level field.
 *
 * FIX: Update both expressions to parse from .text when .credential_warnings is absent
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

// Robust expression that handles both direct JSON field AND text-embedded JSON
const CLAIMS_PARSER_EXPR = `(() => { 
  try { 
    const raw = $('Claims Extractor & Manifest Generator').first().json;
    if (raw.credential_warnings && raw.credential_warnings.length > 0) return JSON.stringify(raw.credential_warnings);
    if (raw.text) {
      const m = raw.text.match(/\\{[\\s\\S]*\\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (parsed.credential_warnings && parsed.credential_warnings.length > 0) return JSON.stringify(parsed.credential_warnings);
      }
    }
    return 'none';
  } catch(e) { return 'none'; }
})()`;

async function main() {
  console.log('Fetching workflow...');
  const wf = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (!wf.nodes) { console.error('Fetch failed'); process.exit(1); }
  fs.writeFileSync('scratch/workflow_backup_pre_cred_patch_v3.json', JSON.stringify(wf, null, 2));
  console.log('Nodes:', wf.nodes.length);

  let patchCount = 0;

  // ── PATCH 1: Surgical Rewriter expression ───────────────────────────────
  const surgNode = wf.nodes.find(n => n.name === 'Surgical Rewriter');
  const surgParams = surgNode?.parameters || {};

  let surgText = '';
  let surgSetter = null;

  // Try all known field locations
  if (typeof surgParams.text === 'string' && surgParams.text.includes('CREDENTIAL WARNINGS')) {
    surgText  = surgParams.text;
    surgSetter = v => { surgNode.parameters.text = v; };
  } else if (surgParams.messages?.values?.[0]?.content?.includes('CREDENTIAL WARNINGS')) {
    surgText  = surgParams.messages.values[0].content;
    surgSetter = v => { surgNode.parameters.messages.values[0].content = v; };
  } else {
    // Search all string fields
    for (const [k, v] of Object.entries(surgParams)) {
      if (typeof v === 'string' && v.includes('CREDENTIAL WARNINGS')) {
        surgText = v; surgSetter = val => { surgNode.parameters[k] = val; }; break;
      }
    }
  }

  if (surgText && surgSetter) {
    // Replace the old expression with the robust one
    const OLD_EXPR = `(() => { const w = $('Claims Extractor & Manifest Generator').first().json.credential_warnings; return (w && w.length > 0) ? JSON.stringify(w) : 'none'; })()`;
    if (surgText.includes(OLD_EXPR)) {
      surgSetter(surgText.replace(OLD_EXPR, CLAIMS_PARSER_EXPR));
      console.log('✅ Surgical Rewriter: expression patched to parse from .text field');
      patchCount++;
    } else {
      // Fallback: find and replace any expression between {{ and }} in the credential block
      const updated = surgText.replace(
        /\{\{ \(\(\) => \{[^}]+credential_warnings[^}]+\}\)\(\) \}\}/,
        `{{ ${CLAIMS_PARSER_EXPR} }}`
      );
      if (updated !== surgText) {
        surgSetter(updated);
        console.log('✅ Surgical Rewriter: expression patched (regex fallback)');
        patchCount++;
      } else {
        console.warn('⚠️  Surgical Rewriter: could not locate expression to patch');
        console.log('Credential block snippet:', surgText.substring(surgText.indexOf('CREDENTIAL'), surgText.indexOf('CREDENTIAL') + 300));
      }
    }
  } else {
    console.warn('⚠️  Surgical Rewriter: CREDENTIAL WARNINGS block not found');
  }

  // ── PATCH 2: AI Agent expression ────────────────────────────────────────
  const agentNode = wf.nodes.find(n => n.name === 'AI Agent1');
  const agentText = agentNode?.parameters?.text || '';

  if (agentText.includes('Credential Warning Override')) {
    const OLD_AGENT_EXPR = `$('Claims Extractor & Manifest Generator').first().json.credential_warnings \n   ? JSON.stringify($('Claims Extractor & Manifest Generator').first().json.credential_warnings) \n   : '[]'`;
    const NEW_AGENT_EXPR = CLAIMS_PARSER_EXPR.replace("'none'", "'[]'");

    if (agentText.includes("$('Claims Extractor & Manifest Generator').first().json.credential_warnings")) {
      // Replace the whole expression block
      const updated = agentText.replace(
        /\$\('Claims Extractor & Manifest Generator'\)\.first\(\)\.json\.credential_warnings[\s\S]*?\}\s*\}\)/,
        CLAIMS_PARSER_EXPR.replace("return 'none'", "return '[]'")
      );
      if (updated !== agentText) {
        agentNode.parameters.text = updated;
        console.log('✅ AI Agent: expression patched to parse from .text field');
        patchCount++;
      } else {
        // Simpler targeted replace
        const simpleOld = `$('Claims Extractor & Manifest Generator').first().json.credential_warnings 
   ? JSON.stringify($('Claims Extractor & Manifest Generator').first().json.credential_warnings) 
   : '[]'`;
        if (agentText.includes(simpleOld)) {
          agentNode.parameters.text = agentText.replace(simpleOld, CLAIMS_PARSER_EXPR.replace("return 'none'", "return '[]'"));
          console.log('✅ AI Agent: expression patched (simple replace)');
          patchCount++;
        } else {
          console.warn('⚠️  AI Agent: expression not found, showing block for manual check:');
          const credIdx = agentText.indexOf('Credential Warning Override');
          console.log(agentText.substring(credIdx, credIdx + 500));
        }
      }
    } else {
      console.log('AI Agent: expression may already be patched or different format');
    }
  } else {
    console.warn('⚠️  AI Agent: Credential Warning Override block not found');
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

    // Verify
    const surgLive  = result.nodes?.find(n => n.name === 'Surgical Rewriter');
    const agentLive = result.nodes?.find(n => n.name === 'AI Agent1');
    const surgStr   = JSON.stringify(surgLive?.parameters || {});
    const agentStr  = agentLive?.parameters?.text || '';

    console.log('\n── VERIFICATION ──');
    console.log('Surgical Rewriter has .text parser: ', surgStr.includes('raw.text') ? '✅' : '❌');
    console.log('AI Agent has .text parser:          ', agentStr.includes('raw.text') ? '✅' : '❌ (may use different expr)');
    console.log('Surgical has "Fully Licensed":      ', surgStr.includes('Fully Licensed And Insured') ? '✅' : '❌');
  } else {
    console.error('❌ Save failed:', JSON.stringify(result).substring(0, 300));
  }
}

main().catch(console.error);
