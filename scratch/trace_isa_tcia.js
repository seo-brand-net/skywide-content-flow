const https = require('https');
const fs    = require('fs');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const o = {
      hostname: 'seobrand.app.n8n.cloud', path, method: 'GET',
      headers: {
        'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM',
        'Accept': 'application/json'
      }
    };
    const req = https.request(o, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject); req.end();
  });
}

function getText(json) {
  if (!json) return '';
  return json.text || json.content || json.message?.content || JSON.stringify(json);
}

async function main() {
  const exec = await apiGet('/api/v1/executions/3004?includeData=true');
  const nodes = exec.data?.resultData?.runData || {};
  const lines = [];
  const log = s => { console.log(s); lines.push(s); };

  log('=== ISA/TCIA CREDENTIAL — FULL PIPELINE TRACE (EXEC 3004) ===\n');

  // 1. What did the brief say about ISA?
  const wh = nodes['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body;
  const brief = wh?.creative_brief || '';
  log('── 1. CREATIVE BRIEF — ISA/TCIA mentions:');
  const briefMatches = brief.match(/.{0,80}(ISA|TCIA|certif|credential|arborist).{0,80}/gi);
  if (briefMatches) briefMatches.forEach(m => log('  BRIEF: ' + m.trim()));
  else log('  (none found in brief)');

  // 2. What did the Client Site Researcher find?
  log('\n── 2. CLIENT SITE RESEARCHER — ISA/TCIA mentions:');
  const researcher = getText(nodes['Client Site Researcher']?.[0]?.data?.main?.[0]?.[0]?.json);
  const resMatches = researcher.match(/.{0,80}(ISA|TCIA|certif|credential|arborist).{0,80}/gi);
  if (resMatches) resMatches.slice(0, 5).forEach(m => log('  WEB: ' + m.trim()));
  else log('  (none found)');

  // 3. What did Claims Extractor produce (verified_claims manifest)?
  log('\n── 3. CLAIMS EXTRACTOR OUTPUT (was it null or populated?):');
  const claimsNode = nodes['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json;
  const claimsText = getText(claimsNode);
  log('  Length: ' + claimsText.length);
  log('  Has ISA: ' + claimsText.includes('ISA'));
  log('  Has TCIA: ' + claimsText.includes('TCIA'));
  log('  Has verified_claims key: ' + claimsText.includes('verified_claims'));
  log('  First 600 chars:');
  log('  ' + claimsText.substring(0, 600));

  // 4. What did Pre-Draft Fact Checker say about ISA?
  log('\n── 4. PRE-DRAFT FACT CHECKER — ISA/TCIA:');
  const preFact = getText(nodes['Pre-Draft Fact Checker']?.[0]?.data?.main?.[0]?.[0]?.json);
  const preMatches = preFact.match(/.{0,80}(ISA|TCIA|certif|credential|arborist).{0,80}/gi);
  if (preMatches) preMatches.slice(0, 5).forEach(m => log('  PRE-FACT: ' + m.trim()));
  else log('  (none found in pre-draft fact check)');

  // 5. What did Claude Draft produce — where did ISA/TCIA appear?
  log('\n── 5. CLAUDE DRAFT — ISA/TCIA injection point:');
  const draft = getText(nodes['Claude Draft (Claude Opus 3)1']?.[0]?.data?.main?.[0]?.[0]?.json);
  const draftISA = draft.match(/.{0,120}(ISA|TCIA|certif|arborist).{0,120}/gi);
  if (draftISA) draftISA.forEach(m => log('  DRAFT: ' + m.trim()));
  else log('  (not in draft)');

  // 6. What did Surgical Rewriter do with it?
  log('\n── 6. SURGICAL REWRITER — did it catch ISA/TCIA?');
  const surgical = getText(nodes['Surgical Rewriter']?.[0]?.data?.main?.[0]?.[0]?.json);
  log('  Surgical output length: ' + surgical.length);
  const surgISA = surgical.match(/.{0,120}(ISA|TCIA|certif|arborist).{0,120}/gi);
  if (surgISA) surgISA.forEach(m => log('  SURGICAL: ' + m.trim()));
  else log('  (ISA/TCIA not in surgical output)');

  // 7. Final article — does it contain ISA/TCIA?
  log('\n── 7. FINAL ARTICLE (raw_content) — ISA/TCIA:');
  const final = getText(nodes['Document Export Sanitization4']?.[0]?.data?.main?.[0]?.[0]?.json);
  const finalISA = final.match(/.{0,120}(ISA|TCIA|certif|arborist).{0,120}/gi);
  if (finalISA) finalISA.forEach(m => log('  FINAL: ' + m.trim()));
  else log('  (not in final output)');

  // 8. Check AI Agent validation — did it flag ISA/TCIA?
  log('\n── 8. AI AGENT VALIDATION — ISA/TCIA flagged?');
  const agent = getText(nodes['AI Agent1']?.[0]?.data?.main?.[0]?.[0]?.json);
  const agentISA = agent.match(/.{0,120}(ISA|TCIA|certif|arborist|credential).{0,120}/gi);
  if (agentISA) agentISA.slice(0, 3).forEach(m => log('  AGENT: ' + m.trim()));
  else log('  (not flagged by AI Agent)');

  // Now check what our CURRENT workflow says about ISA/TCIA in the prompts
  log('\n\n=== CURRENT WORKFLOW — DO OUR FIXES COVER ISA/TCIA? ===');
  const wfRaw = await apiGet('/api/v1/workflows/t3LNiuZIghvobde3');
  const draftNode   = wfRaw.nodes?.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
  const claimsLive  = wfRaw.nodes?.find(n => n.name === 'Claims Extractor & Manifest Generator');
  const surgLive    = wfRaw.nodes?.find(n => n.name === 'Surgical Rewriter');

  const draftPrompt   = draftNode?.parameters?.text || '';
  const claimsPrompt  = getText(claimsLive?.parameters);
  const surgPrompt    = surgLive?.parameters?.text || getText(surgLive?.parameters);

  log('Draft prompt has BRAND ORIGIN guard: ' + draftPrompt.includes('BRAND ORIGIN STORIES'));
  log('Draft prompt has "credential" guard: ' + (draftPrompt.includes('credential') || draftPrompt.includes('CREDENTIAL')));
  log('Draft prompt has ISA guard: '          + draftPrompt.includes('ISA'));

  // Does the Surgical Rewriter check credentials vs verified profile?
  const surgStr = JSON.stringify(surgLive?.parameters || {});
  log('Surgical Rewriter checks credentials: ' + (surgStr.includes('credential') || surgStr.includes('ISA') || surgStr.includes('TCIA')));
  log('Surgical Rewriter uses verified_claims: ' + surgStr.includes('verified_claims'));

  log('\nKEY QUESTION — Claims Extractor: does it cross-ref brief claims vs website?');
  const claimsStr = JSON.stringify(claimsLive?.parameters || {});
  log('Claims prompt mentions ISA: '         + claimsStr.includes('ISA'));
  log('Claims prompt mentions credential: '  + claimsStr.includes('credential'));
  log('Claims prompt cross-references site: '+ (claimsStr.includes('website') || claimsStr.includes('site_research') || claimsStr.includes('cross')));

  fs.writeFileSync('scratch/isa_tcia_trace.txt', lines.join('\n'), 'utf8');
  log('\nSaved: scratch/isa_tcia_trace.txt');
}

main().catch(console.error);
