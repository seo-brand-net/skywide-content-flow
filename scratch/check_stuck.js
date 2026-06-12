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
    const execsRes = await n8nGet('/api/v1/executions?limit=5');
    if (!execsRes || !execsRes.data) return;
    
    // Find an execution that is running or canceled
    const target = execsRes.data.find(x => x.status === 'running' || x.status === 'canceled');
    if (!target) {
        console.log('No running or canceled execution found in top 5.');
        return;
    }
    
    console.log(`Checking execution: ${target.id} (${target.status})`);
    const res = await n8nGet(`/api/v1/executions/${target.id}?includeData=true`);
    const runData = res.data.resultData.runData;
    
    const nodeNames = Object.keys(runData);
    console.log('Nodes that ran:');
    nodeNames.forEach(n => {
        const runs = runData[n].length;
        console.log(`- ${n} (${runs} runs)`);
    });
}
run();
