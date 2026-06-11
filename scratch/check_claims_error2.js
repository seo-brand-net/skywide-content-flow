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
    const res = await n8nGet('/api/v1/executions?limit=5');
    for (const ex of res.data) {
        if (ex.status === 'error') {
            console.log('Execution ID:', ex.id, 'Status:', ex.status);
            const fullEx = await n8nGet('/api/v1/executions/' + ex.id + '?includeData=true');
            const claimsExt = fullEx.data.resultData.runData['Claims Extractor & Manifest Generator'];
            if (claimsExt && claimsExt[0].error) {
                console.log('Node Error:', claimsExt[0].error.message);
                console.log('Description:', claimsExt[0].error.description);
                console.log('Parameters:', claimsExt[0].data?.main?.[0]?.[0]?.json);
            }
        }
    }
}
run();
