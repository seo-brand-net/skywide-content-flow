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
    const ex = await n8nGet('/api/v1/executions/2913?includeData=true');
    const runData = ex.data.resultData.runData;
    const claimsExt = runData['Claims Extractor & Manifest Generator'];
    if (claimsExt) {
        const output = claimsExt[0].data?.main?.[0]?.[0]?.json;
        console.log(Object.keys(output.output || output));
        if (output.output && output.output.forbidden_patterns) {
            console.log('Forbidden Patterns:', output.output.forbidden_patterns);
        } else if (output.forbidden_patterns) {
            console.log('Forbidden Patterns:', output.forbidden_patterns);
        } else {
            console.log('NO FORBIDDEN PATTERNS!');
        }
    }
}
run();
