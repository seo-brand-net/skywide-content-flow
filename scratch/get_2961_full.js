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
    const res = await n8nGet('/api/v1/executions/2961?includeData=true');
    fs.writeFileSync('scratch/exec_2961_full.json', JSON.stringify(res, null, 2));
    
    if (res.data && res.data.resultData && res.data.resultData.runData) {
        const runData = res.data.resultData.runData;
        const nodeNames = Object.keys(runData);
        console.log('Last 5 executed nodes:');
        nodeNames.slice(-5).forEach(n => {
            const r = runData[n][0];
            console.log(n, r.error ? 'ERROR' : 'OK');
        });
        if (runData['Merge5']) {
            console.log('Merge5 execution data:', JSON.stringify(runData['Merge5'][0], null, 2).slice(0, 500));
        } else {
            console.log('Merge5 did not execute.');
        }
    } else {
        console.log('No runData found.');
    }
}
run();
