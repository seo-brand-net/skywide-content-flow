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
  const full = await apiGet('/api/v1/executions/3038?includeData=true');
  const nodes = full.data?.resultData?.runData || {};

  // 1. Full Client Site Researcher output
  const researchNode = nodes['Client Site Researcher']?.[0];
  const researchOut = getText(researchNode?.data?.main?.[0]?.[0]?.json);
  console.log('=== CLIENT SITE RESEARCHER — FULL OUTPUT ===');
  console.log('Length:', researchOut.length);
  console.log(researchOut);
  fs.writeFileSync('scratch/exec3038_site_researcher.txt', researchOut, 'utf8');

  // 2. Full Client Profile Extractor input/output
  const profileOut = getText(nodes['Client Profile Extractor']?.[0]?.data?.main?.[0]?.[0]?.json);
  console.log('\n=== CLIENT PROFILE EXTRACTOR — FULL OUTPUT ===');
  console.log('Length:', profileOut.length);
  console.log(profileOut);
  fs.writeFileSync('scratch/exec3038_client_profile.txt', profileOut, 'utf8');

  // 3. Pre-Draft Fact Checker — what verdicts did it give?
  const preFactOut = getText(nodes['Pre-Draft Fact Checker']?.[0]?.data?.main?.[0]?.[0]?.json);
  // Extract verdicts
  const verdicts = preFactOut.match(/\*\*Verdict:\*\*[\s\S]{0,200}/g) || [];
  console.log('\n=== PRE-DRAFT FACT CHECKER — ALL VERDICTS ===');
  verdicts.forEach(v => console.log(v.replace(/\n/g, ' ').substring(0, 150)));

  // 4. Full AI Agent issues
  const agentOut = nodes['AI Agent1']?.[0]?.data?.main?.[0]?.[0]?.json;
  const issues = agentOut?.output?.validation_issues || agentOut?.validation_issues || '';
  // Extract just the required_claims failures
  const claimsSection = issues.match(/Claims Check failures[\s\S]*/i)?.[0] || 'No claims failures section found';
  console.log('\n=== AI AGENT — CLAIMS CHECK FAILURES ===');
  console.log(claimsSection.substring(0, 1500));

  // 5. Check what Surgical Rewriter actually received — the prompt
  // The Surgical Rewriter prompt is injected with n8n expressions resolved at runtime
  // Check what the node output contains vs what the brief required
  const surgOut = getText(nodes['Surgical Rewriter']?.[0]?.data?.main?.[0]?.[0]?.json);
  const finalOut = getText(nodes['Document Export Sanitization4']?.[0]?.data?.main?.[0]?.[0]?.json);

  const requiredClaims = [
    '2-3 times',
    '2-3x',
    '6-12 inches',
    '6–12 inches',
    'permit',
    'Permit',
  ];
  console.log('\n=== SURGICAL REWRITER — Required claims check in its output ===');
  requiredClaims.forEach(c => {
    const inSurg = surgOut.toLowerCase().includes(c.toLowerCase());
    const inFinal = finalOut.toLowerCase().includes(c.toLowerCase());
    console.log(`  "${c}" → Surgical: ${inSurg?'✅':'❌'} | Final: ${inFinal?'✅':'❌'}`);
  });
}

main().catch(console.error);
