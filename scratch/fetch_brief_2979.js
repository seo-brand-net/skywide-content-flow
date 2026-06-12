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
    
    let brief = "Brief not found";
    
    if (runData['Parse Creative Brief (LLM)']) {
        brief = runData['Parse Creative Brief (LLM)'][0].data.main[0][0].json.message.content;
    }
    
    fs.writeFileSync('scratch/brief_2979.json', brief);
    console.log('Saved brief 2979 to scratch directory.');
}
run();
