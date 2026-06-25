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

async function main() {
  const wf = await apiGet('/api/v1/workflows/t3LNiuZIghvobde3');

  const claims  = wf.nodes.find(n => n.name === 'Claims Extractor & Manifest Generator');
  const model   = wf.nodes.find(n => n.name === 'Claims Extractor Model');
  const surgical = wf.nodes.find(n => n.name === 'Surgical Rewriter');
  const aiAgent  = wf.nodes.find(n => n.name === 'AI Agent1');

  console.log('=== CLAIMS EXTRACTOR & MANIFEST GENERATOR ===');
  console.log('Param keys:', Object.keys(claims?.parameters || {}));
  const claimsText = claims?.parameters?.text || JSON.stringify(claims?.parameters || {});
  console.log('Prompt length:', claimsText.length);
  console.log('\nFull prompt:');
  console.log(claimsText);
  fs.writeFileSync('scratch/live_claims_prompt.txt', claimsText, 'utf8');

  console.log('\n\n=== CLAIMS EXTRACTOR MODEL (which LLM) ===');
  console.log(JSON.stringify(model?.parameters, null, 2).substring(0, 400));

  console.log('\n\n=== SURGICAL REWRITER PROMPT (first 2000) ===');
  const surgText = surgical?.parameters?.text || JSON.stringify(surgical?.parameters || {});
  console.log(surgText.substring(0, 2000));
  fs.writeFileSync('scratch/live_surgical_prompt.txt', surgText, 'utf8');

  console.log('\n\n=== AI AGENT PROMPT (first 1500) ===');
  const agentText = aiAgent?.parameters?.text || JSON.stringify(aiAgent?.parameters || {});
  console.log(agentText.substring(0, 1500));
  fs.writeFileSync('scratch/live_aiagent_prompt.txt', agentText, 'utf8');

  // Also show what inputs Claims Extractor receives (connections)
  console.log('\n\n=== CLAIMS EXTRACTOR — CONNECTIONS IN ===');
  const conns = wf.connections || {};
  Object.entries(conns).forEach(([from, targets]) => {
    const main = targets.main || [];
    main.forEach(outputs => {
      (outputs || []).forEach(edge => {
        if (edge.node === 'Claims Extractor & Manifest Generator') {
          console.log('  Input from:', from, '→ index', edge.index);
        }
      });
    });
  });
}

main().catch(console.error);
