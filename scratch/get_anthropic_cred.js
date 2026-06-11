const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env', 'utf8');
const apiKey = (env.match(/N8N_API_KEY=([^\r\n]+)/) || [])[1]?.trim() || '';
const rawUrl = (env.match(/N8N_BASE_URL=([^\r\n]+)/) || [])[1]?.trim().replace(/["']/g, '') || '';
const base = rawUrl.replace(/\/$/, '');

console.log('Base URL:', base);
console.log('API Key length:', apiKey.length);

function n8nGet(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(base + path);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json' }
        };
        const req = https.request(options, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    // Try different endpoints
    const endpoints = [
        '/api/v1/credentials',
        '/api/v1/credentials?type=anthropicApi',
    ];

    for (const ep of endpoints) {
        console.log('\nTrying:', ep);
        try {
            const res = await n8nGet(ep);
            console.log('Status:', res.status);
            const parsed = JSON.parse(res.body);
            const list = parsed.data || parsed;
            if (Array.isArray(list)) {
                list.forEach(c => console.log(`  → ID: ${c.id} | name: "${c.name}" | type: ${c.type}`));
            } else {
                console.log(res.body.substring(0, 400));
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    }
}

main().catch(console.error);
