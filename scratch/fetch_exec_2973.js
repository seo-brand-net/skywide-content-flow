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
    const res = await n8nGet('/api/v1/executions/2973?includeData=true');
    const runData = res.data.resultData.runData;
    
    let brief = "Brief not found";
    let article = "Article not found";
    
    if (runData['Parse Creative Brief (LLM)']) {
        brief = runData['Parse Creative Brief (LLM)'][0].data.main[0][0].json.message.content;
    }
    
    // Find the furthest point the article reached
    const nodeOrder = ['Document Export Sanitization4', 'Surgical Rewriter', 'AI Agent1', 'Claude Final SEO Snippet Optimization', 'Claude NLP & PR Optimization', 'Claude EEAT Injection1', 'Claude Draft (Claude Opus 3)1'];
    
    for (const n of nodeOrder) {
        if (runData[n]) {
            const data = runData[n][0].data.main[0][0];
            if (data.json && data.json.text) {
                article = data.json.text;
                console.log(`Found article in ${n}`);
                break;
            } else if (data.json && data.json.message && data.json.message.content) {
                article = data.json.message.content;
                console.log(`Found article in ${n} (message.content)`);
                break;
            } else if (data.json && data.json.output && data.json.output.content) {
                article = data.json.output.content;
                console.log(`Found article in ${n} (output.content)`);
                break;
            }
        }
    }
    
    fs.writeFileSync('scratch/brief_2973.json', brief);
    fs.writeFileSync('scratch/article_2973.txt', article);
    console.log('Saved brief and article to scratch directory.');
}
run();
