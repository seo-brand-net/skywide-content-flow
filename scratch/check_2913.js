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
    console.log("Fetching Execution 2913...");
    const ex = await n8nGet('/api/v1/executions/2913?includeData=true');
    const runData = ex.data.resultData.runData;
    
    // Let's get the Claims Extractor node data from that execution
    const claimsExt = runData['Claims Extractor & Manifest Generator'];
    if (claimsExt) {
        console.log("--- Claims Extractor Data from 2913 ---");
        // We want to see the evaluated prompt, or at least the raw output!
        // LangChain nodes often output the parsed JSON in 'data.main[0][0].json'
        console.log(JSON.stringify(claimsExt[0].data?.main?.[0]?.[0]?.json, null, 2).substring(0, 1000));
    } else {
        console.log("No Claims Extractor in 2913??");
    }
    
    // Can we see what schema was used? The execution data sometimes has the execution node definition.
    // However, we can also just dump the output so we know WHAT format the LLM actually outputted!
}
run();
