/**
 * Comprehensive Fix #2 — Two patches:
 *
 * FIX A: Client Site Researcher (Perplexity prompt)
 *   - Add fallback research strategy when site content is thin
 *   - Search Google Business Profile, Yelp, BBB, Angi, HomeAdvisor, Houzz
 *   - Check for certifications from those third-party sources when site doesn't publish them
 *   - Explicitly instruct: if site:domain returns very little, search business name on review/directory sites
 *
 * FIX B: Surgical Rewriter
 *   - Add a MISSING REQUIRED CLAIMS block that reads the claims manifest
 *   - For each required_claim NOT present in the article, insert it into the correct section
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

// ─────────────────────────────────────────────────────────────────────────────
// FIX A — Improved Site Researcher system prompt
// Appended to the existing system prompt after the CRITICAL block
// ─────────────────────────────────────────────────────────────────────────────
const SITE_RESEARCHER_ADDITION = `

FALLBACK RESEARCH STRATEGY (use if site content is thin or inaccessible):
If the site:{{ $('Webhook1').first().json.body.client_website_url }} search returns fewer than 5 meaningful facts, ALSO search:
1. "{{ $('Webhook1').first().json.body.client_name }}" Google Business Profile — for credentials, reviews, services listed
2. "{{ $('Webhook1').first().json.body.client_name }}" site:yelp.com OR site:angi.com OR site:bbb.org — for certifications, accreditations, owner info
3. "{{ $('Webhook1').first().json.body.client_name }}" license OR certified OR insured — for credential verification
4. "{{ $('Webhook1').first().json.body.client_name }}" about OR team OR owner — for team/founder information

When using fallback sources, label each fact with its source:
  [WEBSITE]: fact from their own domain
  [GOOGLE BUSINESS]: fact from Google Business Profile
  [DIRECTORY]: fact from Yelp/Angi/BBB/HomeAdvisor/Houzz
  [SEARCH RESULT]: fact inferred from web search snippets

Credentials found only on third-party directories should be flagged as UNCONFIRMED unless independently verified.
A fact sourced from a third-party platform is weaker than one on the client's own site.`;

// ─────────────────────────────────────────────────────────────────────────────
// FIX B — Surgical Rewriter: MISSING REQUIRED CLAIMS block
// Injected before CORRECTIONS NEEDED
// ─────────────────────────────────────────────────────────────────────────────
const SURGICAL_CLAIMS_BLOCK = `MISSING REQUIRED CLAIMS — Insert these BEFORE processing AI Agent corrections:
{{ (() => {
  try {
    const raw = $('Claims Extractor & Manifest Generator').first().json;
    let manifest = null;
    if (raw.claims) { manifest = raw; }
    else if (raw.text) { const m = raw.text.match(/\{[\s\S]*\}/); if (m) manifest = JSON.parse(m[0]); }
    if (!manifest || !manifest.claims) return 'No manifest available';
    
    const agentRaw = $('AI Agent1').first().json;
    const issues = agentRaw.output?.validation_issues || agentRaw.validation_issues || '';
    
    const missing = [];
    (manifest.claims || []).forEach(c => {
      const phrase = c.claim.substring(0, 30).toLowerCase();
      if (issues.toLowerCase().includes(phrase.substring(0, 15))) {
        missing.push('• ' + c.claim + ' [source: ' + c.source + ']');
      }
    });
    return missing.length > 0 
      ? missing.join('\n')
      : 'All manifest claims appear to be present in article';
  } catch(e) { return 'Could not parse claims: ' + e.message; }
})() }}

For each missing claim listed above:
- Find the most relevant section of the article (match the topic)
- Insert the claim as a natural sentence within that section
- Do NOT add it as a standalone bullet or isolated fact — weave it into existing prose
- Brief-sourced claims may be stated as facts; do not add hedging language unless they were flagged ⚠️ by the Pre-Draft Fact Checker

`;

async function main() {
  console.log('Fetching workflow...');
  const wf = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (!wf.nodes) { console.error('Fetch failed'); process.exit(1); }
  fs.writeFileSync('scratch/workflow_backup_pre_fix2.json', JSON.stringify(wf, null, 2));
  console.log('Nodes:', wf.nodes.length);

  let patchCount = 0;

  // ── FIX A: Client Site Researcher ──────────────────────────────────────────
  const researchNode = wf.nodes.find(n => n.name === 'Client Site Researcher');
  if (!researchNode) { console.error('Client Site Researcher not found'); }
  else {
    const msgs = researchNode.parameters?.messages?.message;
    if (!Array.isArray(msgs)) {
      console.warn('⚠️  Site Researcher: unexpected message structure');
    } else {
      const systemMsg = msgs.find(m => m.role === 'system');
      if (!systemMsg) {
        console.warn('⚠️  Site Researcher: no system message found');
      } else if (systemMsg.content.includes('FALLBACK RESEARCH STRATEGY')) {
        console.log('Site Researcher: fallback strategy already present');
      } else {
        // Append to end of system message content
        systemMsg.content = systemMsg.content + SITE_RESEARCHER_ADDITION;
        console.log('✅ Client Site Researcher: fallback strategy added');
        patchCount++;
      }
    }
  }

  // ── FIX B: Surgical Rewriter — missing required claims block ───────────────
  const surgNode = wf.nodes.find(n => n.name === 'Surgical Rewriter');
  const surgParams = surgNode?.parameters || {};
  let surgText = '';
  let surgSetter = null;

  // Try all known field locations
  if (typeof surgParams.text === 'string' && surgParams.text.includes('CORRECTIONS NEEDED')) {
    surgText  = surgParams.text;
    surgSetter = v => { surgNode.parameters.text = v; };
  } else if (surgParams.messages?.values?.[0]?.content?.includes('CORRECTIONS NEEDED')) {
    surgText  = surgParams.messages.values[0].content;
    surgSetter = v => { surgNode.parameters.messages.values[0].content = v; };
  }

  if (!surgText) {
    console.warn('⚠️  Surgical Rewriter: CORRECTIONS NEEDED not found in any field');
  } else if (surgText.includes('MISSING REQUIRED CLAIMS')) {
    console.log('Surgical Rewriter: required claims block already present');
  } else {
    // Inject just before CORRECTIONS NEEDED
    const anchor = 'CORRECTIONS NEEDED:';
    if (surgText.includes(anchor)) {
      surgSetter(surgText.replace(anchor, SURGICAL_CLAIMS_BLOCK + anchor));
      console.log('✅ Surgical Rewriter: missing required claims block injected');
      patchCount++;
    } else {
      console.warn('⚠️  Surgical Rewriter: CORRECTIONS NEEDED anchor not found');
    }
  }

  if (patchCount === 0) { console.log('No patches to apply.'); return; }

  // Push
  console.log(`\nPushing ${patchCount} patch(es)...`);
  const payload = {
    name: wf.name, nodes: wf.nodes,
    connections: wf.connections, settings: wf.settings,
    staticData: wf.staticData || null
  };
  const result = await apiRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);
  if (result.id || result.name) {
    console.log('✅ Saved:', result.name);

    const resLive  = result.nodes?.find(n => n.name === 'Client Site Researcher');
    const surgLive = result.nodes?.find(n => n.name === 'Surgical Rewriter');
    const resStr   = JSON.stringify(resLive?.parameters || {});
    const surgStr  = JSON.stringify(surgLive?.parameters || {});

    console.log('\n── VERIFICATION ──');
    console.log('Site Researcher fallback strategy: ', resStr.includes('FALLBACK RESEARCH STRATEGY') ? '✅' : '❌');
    console.log('Surgical Rewriter claims block:    ', surgStr.includes('MISSING REQUIRED CLAIMS') ? '✅' : '❌');
  } else {
    console.error('❌ Save failed:', JSON.stringify(result).substring(0, 300));
  }
}

main().catch(console.error);
