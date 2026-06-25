const https = require('https');
const fs = require('fs');

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

async function monitor() {
  console.log('Fetching latest executions to find our test run...');
  const data = await apiGet('/api/v1/executions?workflowId=t3LNiuZIghvobde3&limit=3');
  const execs = data.data || [];
  if (execs.length === 0) {
    console.error('No executions found');
    return;
  }
  let testExec = execs[0];
  console.log('Found execution ID:', testExec.id, 'Status:', testExec.status, 'Started:', testExec.startedAt);
  
  while (testExec.status === 'running' || testExec.status === 'new' || testExec.status === 'waiting') {
    await new Promise(r => setTimeout(r, 15000));
    const statusData = await apiGet('/api/v1/executions/' + testExec.id);
    testExec = statusData;
    console.log(`[${new Date().toISOString()}] Exec ${testExec.id} status: ${testExec.status}`);
  }
  console.log(`Execution ${testExec.id} finished with status: ${testExec.status}`);
  
  if (testExec.status === 'success' || testExec.status === 'error') {
     console.log('Fetching full execution data...');
     const full = await apiGet('/api/v1/executions/' + testExec.id + '?includeData=true');
     fs.writeFileSync('scratch/test_stump_exec.json', JSON.stringify(full, null, 2));
     console.log('Execution data saved to scratch/test_stump_exec.json');
     
     // Print hallucination check info
     const nodes = full.data?.resultData?.runData || {};
     
     // 1. Claims Extractor Output
     const claims = nodes['Claims Extractor & Manifest Generator']?.[0]?.data?.main?.[0]?.[0]?.json;
     console.log('\n--- CLAIMS EXTRACTOR MANIFEST ---');
     console.log(JSON.stringify(claims, null, 2).substring(0, 1000));
     
     // 2. Draft Output
     const draftNode = nodes['Claude Draft (Claude Opus 3)1']?.[0]?.data?.main?.[0]?.[0]?.json;
     const draftText = draftNode?.text || draftNode?.content || draftNode?.message?.content || JSON.stringify(draftNode);
     console.log('\n--- DRAFT OUTPUT (Hallucination flags) ---');
     if (draftText) {
        console.log('Contains Chris Merkel:', draftText.includes('Chris Merkel'));
        console.log('Contains founded in 2021:', draftText.includes('founded in 2021'));
        console.log('Contains ISA:', draftText.includes('ISA'));
        console.log('Contains TCIA:', draftText.includes('TCIA'));
     } else {
        console.log('Draft node not found or empty');
     }
  }
}

monitor().catch(console.error);
