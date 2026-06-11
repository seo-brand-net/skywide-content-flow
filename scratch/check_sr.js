const fs = require('fs');
const https = require('https');
const env = fs.readFileSync('.env', 'utf8');
const apiKey = env.match(/N8N_API_KEY=([^\r\n]+)/)[1].trim().replace(/^["']|["']$/g, '');
const base = env.match(/N8N_BASE_URL=([^\r\n]+)/)[1].trim().replace(/\/$/, '');

function n8nGet(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(base.replace(/["']/g, '') + path);
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
    const ex = await n8nGet('/api/v1/executions/2912?includeData=true');
    const srData = ex.data.resultData.runData['Surgical Rewriter']?.[0]?.data?.main?.[0]?.[0]?.json;
    
    // We want to see what context actually got injected into the text field of Surgical Rewriter
    // However, the actual evaluated text is usually stored in the node input or we can see it in the chain prompt.
    // The chain node usually passes the fully evaluated text in `messages` or `prompt`.
    const srNodeInfo = ex.data.resultData.runData['Surgical Rewriter']?.[0];
    
    console.log("=== Structure Audit 1 ===");
    console.log(ex.data.resultData.runData['Structure Auditor (Pass 1)']?.[0]?.data?.main?.[0]?.[0]?.json?.message?.content);
    
    console.log("\n=== Surgical Rewriter output ===");
    console.log(srData?.data?.substring(0, 500));
}
run();
