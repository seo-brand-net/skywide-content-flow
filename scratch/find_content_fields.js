const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env', 'utf8');
function getEnv(key) {
    const match = env.match(new RegExp(key + '=([^\r\n]+)'));
    if (!match) return '';
    return match[1].trim().replace(/^["']|["']$/g, '');
}
const apiKey = getEnv('N8N_API_KEY');
const base = getEnv('N8N_BASE_URL').replace(/\/$/, '');

function n8nGet(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(base + path);
        const opts = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json' }
        };
        const req = https.request(opts, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.end();
    });
}

function extractText(json) {
    if (!json) return '';
    // For LangChain chainLlm nodes, output is in json.output
    if (typeof json.output === 'string') return json.output;
    // For Perplexity / chat nodes
    if (json.choices?.[0]?.message?.content) return json.choices[0].message.content;
    if (typeof json.content === 'string') return json.content;
    if (typeof json.text === 'string') return json.text;
    if (typeof json.sanitizedContent === 'string') return json.sanitizedContent;
    return '';
}

async function main() {
    const EXEC_IDS = [2911, 2910];

    for (const execId of EXEC_IDS) {
        const detail = await n8nGet(`/api/v1/executions/${execId}?includeData=true`);
        const ex = JSON.parse(detail.body);
        const runData = ex.data?.resultData?.runData || {};

        const wh = runData['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body || {};
        const title = wh.title || 'unknown';

        console.log(`\n${'='.repeat(60)}`);
        console.log(`EXEC ${execId}: ${title}`);
        console.log('='.repeat(60));

        // Dump every node with text content > 100 chars - show field names
        const nodes = Object.keys(runData);
        nodes.forEach(name => {
            const run = runData[name];
            if (!run?.[0]) return;
            const allOutputs = run[0].data?.main || [];
            allOutputs.forEach((grp, gi) => {
                (grp || []).forEach((item, ii) => {
                    const json = item?.json || {};
                    Object.entries(json).forEach(([key, val]) => {
                        if (typeof val === 'string' && val.length > 300) {
                            console.log(`  [${name}] .${key} => ${val.length} chars`);
                        } else if (typeof val === 'object' && val !== null) {
                            const str = JSON.stringify(val);
                            if (str.length > 300) console.log(`  [${name}] .${key} (obj) => ${str.length} chars`);
                        }
                    });
                });
            });
        });
    }
}

main().catch(e => console.error(e.message));
