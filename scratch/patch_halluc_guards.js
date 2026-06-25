/**
 * Patch: Add anti-hallucination guards to Claude Draft and EEAT Injection nodes
 *
 * PROBLEM: Claude Draft injects founder names/origin stories sourced from the
 * Client Profile (e.g. "Chris Merkel, founded in 2021") without any
 * restriction from the brief. EEAT Injection has a good anti-hallucination
 * protocol but is missing an explicit rule against invented testimonials,
 * brand origin stories, and founder anecdotes.
 *
 * FIX: Insert targeted rule blocks into both node prompts.
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

// ── Guard block for CLAUDE DRAFT ──────────────────────────────────────────────
// Injected just before "# Global Rules" so it sits in the system-level
// instruction block, after the CLIENT GROUND TRUTH section.
const DRAFT_GUARD = `
# ⛔ BRAND STORY & TESTIMONIAL PROHIBITION (NON-NEGOTIABLE)

The following content types are STRICTLY FORBIDDEN unless the text appears
verbatim inside the CREATIVE BRIEF above. Presence in the Client Profile
alone does NOT authorise inclusion.

FORBIDDEN (unless in brief):
- Founder names, founding years, or origin stories
  ❌ "Founded in 2021 by Chris Merkel..."
  ❌ "Chris Merkel started the company after..."
  ❌ "The company was established in..."

- Customer testimonials or quoted reviews (real or implied)
  ❌ "One homeowner told us..."
  ❌ "Customers consistently say..."
  ❌ "As one client put it..."

- Brand heritage or legacy claims
  ❌ "With X years of experience..."
  ❌ "A family tradition since..."
  ❌ "Proudly serving the area for..."

If the brief says NOTHING about the company's history, founding, or
testimonials — write NOTHING about them. Reference the company by name
and credentials only.

`;

// ── Guard block for EEAT INJECTION ───────────────────────────────────────────
// Appended as RULE 7 inside the existing anti-hallucination protocol block.
const EEAT_GUARD = `
RULE 7 — NO FOUNDER STORIES, TESTIMONIALS, OR BRAND ORIGIN CONTENT:
  Do NOT add or imply any of the following unless they appear word-for-word
  in the article you received AND in the original creative brief:
  - Founder names, founding years, or how the company started
    ❌ "Founded by..." / "Started in..." / "[Name] built this company..."
  - Customer testimonials or paraphrased reviews
    ❌ "One homeowner shared..." / "Clients report..." / "Reviews show..."
  - Brand heritage or anniversary claims
    ❌ "X years of experience" / "Proudly serving since..." / "A legacy of..."
  EEAT = demonstrating expertise through CONTENT QUALITY, not invented social proof.

`;

async function main() {
  // 1. Fetch the live workflow
  console.log('Fetching workflow', WORKFLOW_ID, '...');
  const wf = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (!wf.nodes) { console.error('Failed to fetch workflow:', JSON.stringify(wf).substring(0, 200)); process.exit(1); }
  console.log('Workflow fetched. Node count:', wf.nodes.length);

  // Save backup
  fs.writeFileSync('scratch/workflow_backup_pre_halluc_patch.json', JSON.stringify(wf, null, 2));
  console.log('Backup saved: scratch/workflow_backup_pre_halluc_patch.json');

  let patchCount = 0;

  // 2. Patch Claude Draft
  const draftNode = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
  if (!draftNode) { console.error('Claude Draft node not found!'); process.exit(1); }

  // Live workflow: messages is { messageValues: [{message: '...'}] }, not an array
  const draftMessages = draftNode.parameters?.messages?.messageValues
                     || draftNode.parameters?.messageValues;
  const useDraftText  = !draftMessages || !draftMessages[0];

  let draftMsg = useDraftText
    ? draftNode.parameters?.text
    : draftMessages[0].message;
  if (!draftMsg) { console.error('Cannot find prompt text on Draft node'); process.exit(1); }
  const DRAFT_ANCHOR = '# Global Rules';

  const applyDraftPatch = (original) => {
    if (original.includes('BRAND STORY & TESTIMONIAL PROHIBITION')) return null; // already patched
    const anchor = original.includes(DRAFT_ANCHOR) ? DRAFT_ANCHOR : '# Writing Voice';
    if (!original.includes(anchor)) { console.warn('⚠️ Draft: no anchor found'); return null; }
    return original.replace(anchor, DRAFT_GUARD + anchor);
  };

  const draftPatched = applyDraftPatch(draftMsg);
  if (draftPatched === null && draftMsg.includes('BRAND STORY & TESTIMONIAL PROHIBITION')) {
    console.log('Claude Draft: guard already present, skipping');
  } else if (draftPatched) {
    if (useDraftText) {
      draftNode.parameters.text = draftPatched;
    } else {
      draftMessages[0].message = draftPatched;
      draftNode.parameters.messages.messageValues = draftMessages;
    }
    console.log('✅ Claude Draft: guard injected');
    patchCount++;
  }

  // 3. Patch EEAT Injection
  const eeatNode = wf.nodes.find(n => n.name === 'Claude EEAT Injection1');
  if (!eeatNode) { console.error('EEAT node not found!'); process.exit(1); }

  const eeatMessages = eeatNode.parameters?.messages?.messageValues
                    || eeatNode.parameters?.messageValues;
  const useEeatText   = !eeatMessages || !eeatMessages[0];

  let eeatMsg = useEeatText
    ? eeatNode.parameters?.text
    : eeatMessages[0].message;
  if (!eeatMsg) { console.error('Cannot find prompt text on EEAT node'); process.exit(1); }
  const EEAT_ANCHOR = 'RULE 6 — REVIEW BEFORE SUBMITTING';

  const applyEeatPatch = (original) => {
    if (original.includes('RULE 7')) return null; // already patched
    if (original.includes(EEAT_ANCHOR)) {
      const idx    = original.indexOf(EEAT_ANCHOR);
      const endIdx = idx + original.substring(idx).indexOf('\n\n');
      return original.substring(0, endIdx) + '\n' + EEAT_GUARD + original.substring(endIdx);
    }
    // Fallback anchor
    const fb = 'You understand how to authentically';
    if (original.includes(fb)) return original.replace(fb, EEAT_GUARD + fb);
    return null;
  };

  const eeatPatched = applyEeatPatch(eeatMsg);
  if (eeatPatched === null && eeatMsg.includes('RULE 7')) {
    console.log('EEAT Injection: Rule 7 already present, skipping');
  } else if (eeatPatched) {
    if (useEeatText) {
      eeatNode.parameters.text = eeatPatched;
    } else {
      eeatMessages[0].message = eeatPatched;
      eeatNode.parameters.messages.messageValues = eeatMessages;
    }
    console.log('✅ EEAT Injection: Rule 7 added');
    patchCount++;
  } else {
    console.warn('⚠️  EEAT: could not inject Rule 7 — no anchor found');
  }

  if (patchCount === 0) {
    console.log('No patches needed — both guards already present.');
    return;
  }

  // 4. Push the patched workflow back
  console.log(`\nPushing ${patchCount} patch(es) to n8n...`);
  const payload = {
    name:        wf.name,
    nodes:       wf.nodes,
    connections: wf.connections,
    settings:    wf.settings,
    staticData:  wf.staticData || null
  };

  const result = await apiRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);

  if (result.id || result.name) {
    console.log('✅ Workflow updated successfully:', result.name || result.id);
    // Verify both guards are in the live workflow
    const draftLive = result.nodes?.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
    const eeatLive  = result.nodes?.find(n => n.name === 'Claude EEAT Injection1');
    console.log('\nVerification:');
    console.log('  Draft guard present:', draftLive?.parameters?.messageValues?.[0]?.message?.includes('BRAND STORY & TESTIMONIAL PROHIBITION') ? '✅ YES' : '❌ NO');
    console.log('  EEAT Rule 7 present:', eeatLive?.parameters?.messageValues?.[0]?.message?.includes('RULE 7') ? '✅ YES' : '❌ NO');
  } else {
    console.error('❌ Workflow update may have failed:', JSON.stringify(result).substring(0, 300));
  }
}

main().catch(console.error);
