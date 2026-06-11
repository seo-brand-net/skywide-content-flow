const fs = require('fs');
const https = require('https');
const env = fs.readFileSync('.env', 'utf8');
const apiKey = env.match(/N8N_API_KEY=([^\r\n]+)/)[1].trim().replace(/^["']|["']$/g, '');
const base = env.match(/N8N_BASE_URL=([^\r\n]+)/)[1].trim().replace(/\/$/, '').replace(/^["']|["']$/g, '');

function n8nGet(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(base + path);
        const req = https.request({
            hostname: url.hostname, path: url.pathname + url.search, method: 'GET',
            headers: { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json' }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.end();
    });
}

async function run() {
    const res = await n8nGet('/api/v1/executions?limit=1');
    const execId = res.data[0].id;
    const ex = await n8nGet('/api/v1/executions/' + execId + '?includeData=true');
    const err = ex.data.resultData.error;
    console.log('Execution ID:', execId);
    console.log('Error:', err?.message);
    
    const runData = ex.data.resultData.runData;
    const claimsExt = runData['Claims Extractor & Manifest Generator'];
    if (claimsExt) {
      console.log('Node error message:', claimsExt[0].error?.message);
      // Let's dump the input that was fed into the output parser, or the model's raw string if it's there
      console.log('Raw output from model (if available):');
      // In n8n, if output parsing fails, the raw LLM output is often in the error object or node data
      if (claimsExt[0].error?.description) {
         console.log(claimsExt[0].error.description);
      }
    }
}
run();
