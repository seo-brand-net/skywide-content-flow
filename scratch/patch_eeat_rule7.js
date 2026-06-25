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
  const wf = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  const eeatNode = wf.nodes.find(n => n.name === 'Claude EEAT Injection1');

  console.log('EEAT param keys:', Object.keys(eeatNode.parameters || {}));

  // Inspect ALL string fields to find where the long prompt lives
  const params = eeatNode.parameters || {};
  for (const [key, val] of Object.entries(params)) {
    if (typeof val === 'string') {
      console.log(`\nField [${key}] length: ${val.length}`);
      console.log('Has RULE 6:', val.includes('RULE 6'));
      console.log('Has RULE 7:', val.includes('RULE 7'));
      console.log('Has ANTI-HALLUCINATION:', val.includes('ANTI-HALLUCINATION'));
      console.log('First 200:', val.substring(0, 200));
    } else if (typeof val === 'object' && val !== null) {
      const str = JSON.stringify(val);
      console.log(`\nField [${key}] (object, ${str.length} chars)`);
      console.log('Has RULE 6:', str.includes('RULE 6'));
      console.log('Has RULE 7:', str.includes('RULE 7'));
    }
  }

  // Find where RULE 6 lives and patch that exact field
  let patchedField = null;
  let patchCount = 0;

  for (const [key, val] of Object.entries(params)) {
    if (typeof val === 'string' && val.includes('RULE 6') && !val.includes('RULE 7')) {
      console.log(`\n→ Patching params.${key} (RULE 6 found, RULE 7 missing)`);
      const ANCHOR = 'RULE 6 — REVIEW BEFORE SUBMITTING';
      const idx = val.indexOf(ANCHOR);
      // Find next double newline after Rule 6
      const after = val.substring(idx);
      const endOfBlock = after.search(/\n{2,}[A-Z\n]/);
      const insertAt = idx + (endOfBlock > -1 ? endOfBlock : after.length);
      eeatNode.parameters[key] = val.substring(0, insertAt) + '\n' + EEAT_GUARD + val.substring(insertAt);
      patchedField = key;
      patchCount++;
      break;
    } else if (typeof val === 'object') {
      const str = JSON.stringify(val);
      if (str.includes('RULE 6') && !str.includes('RULE 7')) {
        // It's nested - need to rebuild the object
        const rebuilt = JSON.parse(str.replace(
          'RULE 6 — REVIEW BEFORE SUBMITTING',
          'RULE 6 — REVIEW BEFORE SUBMITTING'
        ));
        // Find the messageValues path
        const mv = val.messageValues;
        if (mv) {
          for (let i = 0; i < mv.length; i++) {
            const msg = mv[i].message || '';
            if (msg.includes('RULE 6') && !msg.includes('RULE 7')) {
              const ANCHOR = 'RULE 6 — REVIEW BEFORE SUBMITTING';
              const msgIdx = msg.indexOf(ANCHOR);
              const after = msg.substring(msgIdx);
              const endOfBlock = after.search(/\n{2,}[A-Z\n]/);
              const insertAt = msgIdx + (endOfBlock > -1 ? endOfBlock : after.length);
              eeatNode.parameters[key].messageValues[i].message =
                msg.substring(0, insertAt) + '\n' + EEAT_GUARD + msg.substring(insertAt);
              console.log(`→ Patched params.${key}.messageValues[${i}].message`);
              patchedField = `${key}.messageValues[${i}].message`;
              patchCount++;
            }
          }
        }
      }
    }
  }

  if (patchCount === 0) {
    console.log('\nEEAT already has RULE 7 or no RULE 6 found — checking current state:');
    const textVal = params.text || '';
    const msgVal = params.messages?.messageValues?.[0]?.message || '';
    console.log('text has RULE 7:', textVal.includes('RULE 7'));
    console.log('msg  has RULE 7:', msgVal.includes('RULE 7'));
    return;
  }

  console.log('\nPushing EEAT patch...');
  const payload = {
    name: wf.name, nodes: wf.nodes,
    connections: wf.connections, settings: wf.settings,
    staticData: wf.staticData || null
  };
  const result = await apiRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);
  if (result.id || result.name) {
    console.log('✅ Saved:', result.name);
    const live = result.nodes?.find(n => n.name === 'Claude EEAT Injection1');
    const liveText = live?.parameters?.text || '';
    const liveMsg  = live?.parameters?.messages?.messageValues?.[0]?.message || '';
    console.log('\n── FINAL VERIFICATION ──');
    console.log('Draft guard in text:   ', result.nodes?.find(n => n.name === 'Claude Draft (Claude Opus 3)1')?.parameters?.text?.includes('BRAND ORIGIN STORIES') ? '✅' : '❌');
    console.log('EEAT  Rule 7 in text:  ', liveText.includes('RULE 7') ? '✅' : '❌');
    console.log('EEAT  Rule 7 in msg:   ', liveMsg.includes('RULE 7') ? '✅' : '❌');
  } else {
    console.error('❌ Save failed:', JSON.stringify(result).substring(0, 300));
  }
}
main().catch(console.error);
