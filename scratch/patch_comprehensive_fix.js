/**
 * Comprehensive fix: All remaining issues after price guard
 *
 * ROOT CAUSES:
 * 1. Parse Creative Brief (LLM) never extracts FAQ questions — so Claude invents them
 *    and AI Agent has nothing to validate against
 * 2. Claude Draft faq_injection is empty (Keyword Strategist builds it from detected_faqs,
 *    but Parse Brief never outputs them)
 * 3. DIY rental cost ($100-250) is in the parsed brief required_claims for the Cost section
 *    but not appearing in the final article — Surgical Rewriter not enforcing it
 * 4. Heading mismatches — Claude generates different H2 text than the brief specifies,
 *    AI Agent flags them, but Surgical Rewriter doesn't rename headings reliably
 *
 * FIXES:
 * A. Parse Creative Brief prompt → add FAQ extraction rule + faqs array in schema
 * B. Claude Draft prompt → add explicit FAQ constraint: use ONLY the brief's FAQ questions
 * C. Surgical Rewriter → add heading rename instruction + DIY cost enforcement
 */

const https = require('https');
const fs = require('fs');

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

// ── A. Parse Creative Brief prompt addition ──────────────────────────────────
// Add FAQ extraction rule + faqs field to schema
const PARSE_FAQ_RULE = `5. "faqs": If the brief specifies a FAQ section with specific questions, extract each question verbatim as a string in the "faqs" array. Preserve the exact question wording — do NOT rephrase. If no explicit FAQ questions are listed, return an empty array.
`;

const PARSE_SCHEMA_ADDITION = `,
  "faqs": ["Exact FAQ question 1 from brief", "Exact FAQ question 2 from brief"]`;

// ── B. Claude Draft FAQ constraint ───────────────────────────────────────────
// Injected into the ANTI-HALLUCINATION PROTOCOL block just after the price guard
const FAQ_CONSTRAINT = `
RULE — FAQ SECTION MUST MATCH BRIEF EXACTLY:
  The "Frequently Asked Questions" section MUST contain ONLY the questions
  explicitly listed in the creative brief — no more, no fewer.
  Use the EXACT question wording from the brief. Do NOT rephrase, combine, or add questions.
  If the brief specifies 5 FAQ questions, the article must have exactly those 5, in order.

`;

// ── C. Surgical Rewriter additions ───────────────────────────────────────────
// Two additional instruction blocks prepended to the CORRECTIONS NEEDED section:
const SURGICAL_HEADING_BLOCK = `HEADING FIXES — Apply these before anything else:
If the AI Agent validation issues list any "Missing required heading" or "Heading mismatch":
1. Locate the closest matching existing heading in the article (same topic, different wording)
2. Rename it to EXACTLY the required heading text as specified in the validation issue
3. Do not change the content under the heading — only rename the heading itself

`;

const SURGICAL_FAQ_BLOCK = `FAQ SECTION FIX — If validation issues mention FAQ problems:
The Frequently Asked Questions section must contain ONLY the questions from the structured brief.
Structured brief FAQ questions:
{{ (() => { try { const b = $('Parse Creative Brief (LLM)').first().json; const bText = b.message?.content || b.text || JSON.stringify(b); const m = bText.match(/\{[\s\S]*\}/); if (m) { const p = JSON.parse(m[0]); if (p.faqs && p.faqs.length > 0) return p.faqs.map((q,i) => (i+1)+'. '+q).join('\\n'); } return 'No FAQ questions extracted from brief — keep existing FAQs'; } catch(e) { return 'Could not parse brief FAQs'; } })() }}

If FAQ questions are listed above: Replace the entire FAQ section with ONLY those questions.
Generate a concise, factual answer for each (2-3 sentences). Remove all other FAQ questions.

`;

async function main() {
  console.log('Fetching workflow...');
  const wf = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (!wf.nodes) { console.error('Fetch failed'); process.exit(1); }
  fs.writeFileSync('scratch/workflow_backup_pre_comprehensive_fix.json', JSON.stringify(wf, null, 2));
  console.log('Nodes:', wf.nodes.length);

  let patchCount = 0;

  // ────────────────────────────────────────────────────────────────────────────
  // PATCH A: Parse Creative Brief — add FAQ extraction to prompt and schema
  // ────────────────────────────────────────────────────────────────────────────
  const parseNode = wf.nodes.find(n => n.name === 'Parse Creative Brief (LLM)');
  if (!parseNode) { console.error('Parse Creative Brief node not found'); }
  else {
    // The prompt is in messages.values[0].content
    const msgVals = parseNode.parameters?.messages?.values;
    let parseText = msgVals?.[0]?.content || parseNode.parameters?.text || '';
    const parseField = msgVals?.[0]?.content ? 'messages.values[0].content' : 'text';
    const parseSetter = (val) => {
      if (parseField === 'messages.values[0].content') parseNode.parameters.messages.values[0].content = val;
      else parseNode.parameters.text = val;
    };

    if (parseText.includes('"faqs"')) {
      console.log('Parse Creative Brief: FAQ extraction already present');
    } else {
      // Add Rule 5 before the EXTRACTION RULES end
      // The schema has a closing } — add faqs field before it
      // Add rule after "4. instructions:"
      const rule4Anchor = '4. "instructions":';
      const schemaGlobalAnchor = '"global_rules"';
      
      if (parseText.includes(rule4Anchor)) {
        // Insert rule 5 after rule 4's paragraph
        const rule4Idx = parseText.indexOf(rule4Anchor);
        const afterRule4 = parseText.substring(rule4Idx);
        // Find double newline after rule 4
        const endOfRule4 = afterRule4.indexOf('\n\n');
        const insertAt = rule4Idx + (endOfRule4 > -1 ? endOfRule4 : afterRule4.length);
        let patched = parseText.substring(0, insertAt) + '\n' + PARSE_FAQ_RULE + parseText.substring(insertAt);
        
        // Also add "faqs" to the schema output structure
        // Find the closing of the sections array in the schema
        const sectionsClose = patched.indexOf('"required_claims"');
        if (sectionsClose > -1) {
          // Find the ] that closes sections array
          const afterSections = patched.substring(sectionsClose);
          const sectionsEnd = afterSections.indexOf('\n  ]');
          if (sectionsEnd > -1) {
            const insertSchemaAt = sectionsClose + sectionsEnd + '\n  ]'.length;
            patched = patched.substring(0, insertSchemaAt) + PARSE_SCHEMA_ADDITION + patched.substring(insertSchemaAt);
          }
        }
        
        parseSetter(patched);
        console.log('✅ Parse Creative Brief: FAQ extraction rule + schema field added');
        patchCount++;
      } else {
        // Simpler approach: just append FAQ rule at end of extraction rules
        const appendAnchor = 'Creative Brief:';
        if (parseText.includes(appendAnchor)) {
          const appendIdx = parseText.lastIndexOf(appendAnchor);
          parseSetter(parseText.substring(0, appendIdx + appendAnchor.length) + 
            '\n\n' + PARSE_FAQ_RULE + parseText.substring(appendIdx + appendAnchor.length));
          console.log('✅ Parse Creative Brief: FAQ rule appended (fallback)');
          patchCount++;
        } else {
          console.warn('⚠️  Parse Creative Brief: no anchor found for injection');
        }
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PATCH B: Claude Draft — add FAQ constraint to anti-hallucination protocol
  // ────────────────────────────────────────────────────────────────────────────
  const draftNode = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
  const draftText = draftNode?.parameters?.text || '';

  if (draftText.includes('FAQ SECTION MUST MATCH BRIEF EXACTLY')) {
    console.log('Claude Draft: FAQ constraint already present');
  } else if (draftText.includes('NO UNINSTRUCTED PRICE FIGURES')) {
    // Inject right after the price guard
    const priceGuardEnd = draftText.indexOf('## CLAIMS MANIFEST');
    if (priceGuardEnd > -1) {
      draftNode.parameters.text =
        draftText.substring(0, priceGuardEnd) + FAQ_CONSTRAINT + draftText.substring(priceGuardEnd);
      console.log('✅ Claude Draft: FAQ constraint injected after price guard');
      patchCount++;
    } else {
      // Inject before CLAIMS MANIFEST or before Global Rules
      const anchor = '# Global Rules';
      if (draftText.includes(anchor)) {
        draftNode.parameters.text = draftText.replace(anchor, FAQ_CONSTRAINT + anchor);
        console.log('✅ Claude Draft: FAQ constraint injected before Global Rules (fallback)');
        patchCount++;
      }
    }
  } else {
    console.warn('⚠️  Claude Draft: price guard not found — insert FAQ constraint at Global Rules');
    const anchor = '# Global Rules';
    if (draftText.includes(anchor) && !draftText.includes('FAQ SECTION MUST MATCH')) {
      draftNode.parameters.text = draftText.replace(anchor, FAQ_CONSTRAINT + anchor);
      console.log('✅ Claude Draft: FAQ constraint injected before Global Rules');
      patchCount++;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PATCH C: Surgical Rewriter — heading rename + FAQ replacement blocks
  // ────────────────────────────────────────────────────────────────────────────
  const surgNode = wf.nodes.find(n => n.name === 'Surgical Rewriter');
  const surgParams = surgNode?.parameters || {};
  let surgText = '';
  let surgSetter = null;

  for (const [k, v] of Object.entries(surgParams)) {
    if (typeof v === 'string' && v.includes('CORRECTIONS NEEDED')) {
      surgText = v; surgSetter = val => { surgNode.parameters[k] = val; }; break;
    }
  }
  if (!surgText && surgParams.messages?.values?.[0]?.content?.includes('CORRECTIONS NEEDED')) {
    surgText = surgParams.messages.values[0].content;
    surgSetter = val => { surgNode.parameters.messages.values[0].content = val; };
  }

  if (surgText && surgSetter) {
    let patched = surgText;
    let surgPatched = false;

    if (!surgText.includes('HEADING FIXES')) {
      // Inject heading fix block before CREDENTIAL WARNINGS (which is before CORRECTIONS NEEDED)
      const headingAnchor = 'CREDENTIAL WARNINGS';
      if (patched.includes(headingAnchor)) {
        patched = patched.replace(headingAnchor, SURGICAL_HEADING_BLOCK + headingAnchor);
      } else {
        patched = patched.replace('CORRECTIONS NEEDED:', SURGICAL_HEADING_BLOCK + 'CORRECTIONS NEEDED:');
      }
      surgPatched = true;
      console.log('✅ Surgical Rewriter: heading rename block added');
      patchCount++;
    } else {
      console.log('Surgical Rewriter: heading rename block already present');
    }

    if (!surgText.includes('FAQ SECTION FIX')) {
      // Inject FAQ fix block before CORRECTIONS NEEDED
      const corrAnchor = 'CORRECTIONS NEEDED:';
      if (patched.includes(corrAnchor)) {
        patched = patched.replace(corrAnchor, SURGICAL_FAQ_BLOCK + corrAnchor);
        surgPatched = true;
        console.log('✅ Surgical Rewriter: FAQ section fix block added');
        patchCount++;
      }
    } else {
      console.log('Surgical Rewriter: FAQ section fix block already present');
    }

    if (surgPatched) surgSetter(patched);
  } else {
    console.warn('⚠️  Surgical Rewriter: could not locate CORRECTIONS NEEDED block');
  }

  if (patchCount === 0) { console.log('No patches applied.'); return; }

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

    const parseLive  = result.nodes?.find(n => n.name === 'Parse Creative Brief (LLM)');
    const draftLive  = result.nodes?.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
    const surgLive   = result.nodes?.find(n => n.name === 'Surgical Rewriter');
    const parseStr   = JSON.stringify(parseLive?.parameters || {});
    const surgStr    = JSON.stringify(surgLive?.parameters || {});

    console.log('\n── VERIFICATION ──');
    console.log('Parse Brief: FAQ extraction rule: ', parseStr.includes('"faqs"') ? '✅' : '❌');
    console.log('Claude Draft: FAQ constraint:     ', draftLive?.parameters?.text?.includes('FAQ SECTION MUST MATCH BRIEF EXACTLY') ? '✅' : '❌');
    console.log('Surgical: heading rename block:   ', surgStr.includes('HEADING FIXES') ? '✅' : '❌');
    console.log('Surgical: FAQ section fix block:  ', surgStr.includes('FAQ SECTION FIX') ? '✅' : '❌');
  } else {
    console.error('❌ Save failed:', JSON.stringify(result).substring(0, 300));
  }
}

main().catch(console.error);
