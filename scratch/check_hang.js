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
    const res = await n8nGet('/api/v1/executions/2979?includeData=true');
    const runData = res.data.resultData.runData;
    
    if (runData['Google Drive Notification1']) {
        const d = runData['Google Drive Notification1'][0];
        console.log('Google Drive Notification1 Execution Time:', d.startTime, 'to', d.executionTime);
        if (d.error) {
            console.log('Error:', d.error.message);
        } else {
            console.log('Finished successfully');
        }
    }
    
    // Find if there is any node that doesn't have an executionTime (which means it hung)
    console.log('\nChecking for hanging nodes:');
    for (const key in runData) {
        runData[key].forEach((run, index) => {
            if (run.executionTime === undefined) {
                console.log(`Node ${key} (run ${index}) has no executionTime. Error:`, run.error ? run.error.message : 'none');
            }
        });
    }
}
run();
