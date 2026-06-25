const https = require('https');
const fs = require('fs');

function apiGet(p) {
  return new Promise((res, rej) => {
    const o = {
      hostname: 'seobrand.app.n8n.cloud', path: p, method: 'GET',
      headers: {
        'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM',
        'Accept': 'application/json'
      }
    };
    const req = https.request(o, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { res(d); } });
    });
    req.on('error', rej); req.end();
  });
}

function getText(j) {
  if (!j) return '';
  if (typeof j === 'string') return j;
  return j.text || j.content || j.output || j.message?.content || JSON.stringify(j);
}

async function main() {
  const full = await apiGet('/api/v1/executions/3035?includeData=true');
  const nodes = full.data?.resultData?.runData || {};

  // 1. Parse Creative Brief output — this is what the AI Agent validates against
  const parsedBrief = getText(nodes['Parse Creative Brief (LLM)']?.[0]?.data?.main?.[0]?.[0]?.json);
  console.log('=== PARSE CREATIVE BRIEF OUTPUT (full) ===');
  console.log(parsedBrief.substring(0, 4000));
  fs.writeFileSync('scratch/exec3035_parsed_brief.txt', parsedBrief, 'utf8');

  // 2. Keyword Strategist faq_injection
  const kwNode = nodes['Keyword Strategist']?.[0]?.data?.main?.[0]?.[0]?.json;
  const faqInject = kwNode?.faq_injection || '';
  console.log('\n=== KEYWORD STRATEGIST — faq_injection ===');
  console.log(faqInject.substring(0, 1000));

  // 3. AI Agent full validation issues (not truncated)
  const agentRaw = nodes['AI Agent1']?.[0]?.data?.main?.[0]?.[0]?.json;
  const issues = agentRaw?.output?.validation_issues || agentRaw?.validation_issues || '';
  console.log('\n=== AI AGENT VALIDATION ISSUES (full) ===');
  console.log(issues.substring(0, 3000));
  fs.writeFileSync('scratch/exec3035_agent_issues.txt', issues, 'utf8');

  // 4. Surgical Rewriter input — what corrections did it receive?
  const surgInput = nodes['Surgical Rewriter']?.[0]?.data?.main?.[0]?.[0]?.json;
  console.log('\n=== SURGICAL REWRITER — param snapshot ===');
  // The Surgical Rewriter reads from AI Agent output — confirm what it got
  console.log('Output length:', getText(surgInput).length);

  // 5. Check what the Live workflow sends to Claude Draft as faq_injection
  const wf = await apiGet('/api/v1/workflows/t3LNiuZIghvobde3');
  const kwLive = wf.nodes.find(n => n.name === 'Keyword Strategist');
  const kwText = kwLive?.parameters?.text || JSON.stringify(kwLive?.parameters || {});
  const faqIdx = kwText.indexOf('faq_injection');
  console.log('\n=== KEYWORD STRATEGIST — faq_injection generation logic ===');
  console.log(kwText.substring(Math.max(0, faqIdx - 50), faqIdx + 600));

  // 6. Live Parse Creative Brief prompt — what does it ask for?
  const parseLive = wf.nodes.find(n => n.name === 'Parse Creative Brief (LLM)');
  const parseText = parseLive?.parameters?.text || JSON.stringify(parseLive?.parameters || {});
  console.log('\n=== PARSE CREATIVE BRIEF — live prompt (first 1500) ===');
  console.log(parseText.substring(0, 1500));
  fs.writeFileSync('scratch/live_parse_brief_prompt.txt', parseText, 'utf8');
}

main().catch(console.error);
