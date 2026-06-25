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

// ── What to add to Claude Draft ─────────────────────────────────────────────
// Injected INSIDE the existing anti-hallucination protocol block in parameters.text
const DRAFT_GUARD = `
RULE — NO BRAND ORIGIN STORIES, FOUNDER ANECDOTES, OR TESTIMONIALS:
  The following are STRICTLY FORBIDDEN unless the text appears VERBATIM
  in the CREATIVE BRIEF or is explicitly flagged in VERIFIED UNIQUE CLAIMS:

  ❌ Founder names, founding dates, or origin stories
     e.g. "Founded in 2021 by Chris Merkel..." / "Chris Merkel started..."
  ❌ Customer testimonials, quoted reviews, or attributed feedback
     e.g. "One homeowner told us..." / "Customers consistently report..."
  ❌ Brand heritage or legacy claims
     e.g. "X years of experience..." / "Proudly serving since..." / "A family tradition..."

  Having founder data in the Client Profile does NOT authorise inclusion.
  If the brief says nothing about history or testimonials — write nothing about them.
  Reference the company by name and verified credentials ONLY.

`;

// ── What to add to EEAT Injection ───────────────────────────────────────────
// Rule 7 appended after Rule 6 in parameters.text
const EEAT_GUARD = `
RULE 7 — NO FOUNDER STORIES, TESTIMONIALS, OR BRAND ORIGIN CONTENT:
  Do NOT add or imply any of the following unless they appear verbatim
  in the article you received AND in the original creative brief:
  - Founder names, founding years, or how the company started
    e.g. "Founded by..." / "Started in..." / "[Name] built this company..."
  - Customer testimonials or paraphrased reviews
    e.g. "One homeowner shared..." / "Clients report..." / "Reviews show..."
  - Brand heritage or anniversary claims
    e.g. "X years of experience" / "Proudly serving since..." / "A legacy of..."
  EEAT = demonstrating expertise through CONTENT QUALITY, not invented social proof.

`;

async function main() {
  console.log('Fetching live workflow...');
  const wf = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (!wf.nodes) { console.error('Fetch failed:', JSON.stringify(wf).substring(0, 200)); process.exit(1); }
  console.log('Node count:', wf.nodes.length);
  fs.writeFileSync('scratch/workflow_backup_pre_halluc_patch2.json', JSON.stringify(wf, null, 2));

  let patchCount = 0;

  // ── 1. Patch Claude Draft (parameters.text) ──────────────────────────────
  const draftNode = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
  if (!draftNode) { console.error('Claude Draft node not found'); process.exit(1); }

  const draftText = draftNode.parameters?.text || '';
  const DRAFT_ANCHOR = '# ⛔ ANTI-HALLUCINATION PROTOCOL (NON-NEGOTIABLE)';

  if (draftText.includes('BRAND ORIGIN STORIES')) {
    console.log('Claude Draft: guard already present');
  } else if (draftText.includes(DRAFT_ANCHOR)) {
    // Inject our rule as an additional bullet INSIDE the existing protocol block
    // The protocol ends with a blank line before the next # section
    const anchorIdx = draftText.indexOf(DRAFT_ANCHOR);
    // Find the next heading after the protocol block
    const afterProtocol = draftText.substring(anchorIdx + DRAFT_ANCHOR.length);
    const nextHeadingMatch = afterProtocol.match(/\n# /);
    if (nextHeadingMatch) {
      const insertIdx = anchorIdx + DRAFT_ANCHOR.length + nextHeadingMatch.index;
      draftNode.parameters.text = draftText.substring(0, insertIdx) + '\n' + DRAFT_GUARD + draftText.substring(insertIdx);
      console.log('✅ Claude Draft: guard injected inside Anti-Hallucination Protocol block');
      patchCount++;
    } else {
      // Append before "# Global Rules" as fallback
      draftNode.parameters.text = draftText.replace('# Global Rules', DRAFT_GUARD + '# Global Rules');
      console.log('✅ Claude Draft: guard injected before # Global Rules (fallback)');
      patchCount++;
    }
  } else if (draftText.includes('# Global Rules')) {
    draftNode.parameters.text = draftText.replace('# Global Rules', DRAFT_GUARD + '# Global Rules');
    console.log('✅ Claude Draft: guard injected before # Global Rules');
    patchCount++;
  } else {
    console.warn('⚠️  Claude Draft: no suitable anchor found in text');
  }

  // ── 2. Patch EEAT Injection (parameters.text) ───────────────────────────
  const eeatNode = wf.nodes.find(n => n.name === 'Claude EEAT Injection1');
  if (!eeatNode) { console.error('EEAT node not found'); process.exit(1); }

  const eeatText = eeatNode.parameters?.text || '';
  const EEAT_ANCHOR = 'RULE 6 — REVIEW BEFORE SUBMITTING';

  if (eeatText.includes('RULE 7')) {
    console.log('EEAT Injection: Rule 7 already present');
  } else if (eeatText.includes(EEAT_ANCHOR)) {
    // Find the blank line after Rule 6's content
    const rule6Idx = eeatText.indexOf(EEAT_ANCHOR);
    const afterRule6 = eeatText.substring(rule6Idx);
    // Find the double newline that ends the Rule 6 block
    const endOfRule6 = afterRule6.indexOf('\n\n\n') > -1
      ? afterRule6.indexOf('\n\n\n')
      : afterRule6.indexOf('\n\n');
    const insertIdx = rule6Idx + endOfRule6;
    eeatNode.parameters.text = eeatText.substring(0, insertIdx) + '\n' + EEAT_GUARD + eeatText.substring(insertIdx);
    console.log('✅ EEAT Injection: Rule 7 inserted after Rule 6');
    patchCount++;
  } else {
    // Fallback - append before "You understand how to authentically"
    const fb = 'You understand how to authentically';
    if (eeatText.includes(fb) && !eeatText.includes('RULE 7')) {
      eeatNode.parameters.text = eeatText.replace(fb, EEAT_GUARD + fb);
      console.log('✅ EEAT Injection: Rule 7 added via fallback anchor');
      patchCount++;
    } else {
      console.warn('⚠️  EEAT: no anchor found');
    }
  }

  if (patchCount === 0) {
    console.log('No changes needed.');
    return;
  }

  // ── 3. Push the updated workflow ─────────────────────────────────────────
  console.log(`\nPushing ${patchCount} patch(es)...`);
  const payload = {
    name:        wf.name,
    nodes:       wf.nodes,
    connections: wf.connections,
    settings:    wf.settings,
    staticData:  wf.staticData || null
  };

  const result = await apiRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);

  if (result.id || result.name) {
    console.log('✅ Workflow saved:', result.name || result.id);

    const draftLive = result.nodes?.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
    const eeatLive  = result.nodes?.find(n => n.name === 'Claude EEAT Injection1');

    const draftOk = draftLive?.parameters?.text?.includes('BRAND ORIGIN STORIES');
    const eeatOk  = eeatLive?.parameters?.text?.includes('RULE 7');

    console.log('\n── VERIFICATION ──');
    console.log('Draft guard (BRAND ORIGIN STORIES):', draftOk ? '✅ CONFIRMED' : '❌ NOT FOUND');
    console.log('EEAT  guard (RULE 7):', eeatOk ? '✅ CONFIRMED' : '❌ NOT FOUND');

    if (!draftOk || !eeatOk) {
      console.log('\nChecking alternate fields...');
      const draftMsg = draftLive?.parameters?.messages?.messageValues?.[0]?.message || '';
      const eeatMsg  = eeatLive?.parameters?.messages?.messageValues?.[0]?.message  || '';
      console.log('Draft msg has guard:', draftMsg.includes('BRAND ORIGIN STORIES'));
      console.log('EEAT  msg has RULE 7:', eeatMsg.includes('RULE 7'));
    }
  } else {
    console.error('❌ Update may have failed:', JSON.stringify(result).substring(0, 400));
  }
}

main().catch(console.error);
