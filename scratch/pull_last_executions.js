const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env', 'utf8');

// Strip surrounding quotes from values
function getEnv(key) {
    const match = env.match(new RegExp(key + '=([^\r\n]+)'));
    if (!match) return '';
    return match[1].trim().replace(/^["']|["']$/g, '');
}

const apiKey = getEnv('N8N_API_KEY');
const base = getEnv('N8N_BASE_URL').replace(/\/$/, '');
const WORKFLOW_ID = 't3LNiuZIghvobde3';

console.log('Base URL:', base);
console.log('API Key (first 20):', apiKey.substring(0, 20) + '...');

function n8nGet(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(base + path);
        const opts = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'X-N8N-API-KEY': apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
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

async function main() {
    // First test basic connectivity with /api/v1/workflows
    console.log('\nTesting API connectivity...');
    const test = await n8nGet('/api/v1/workflows?limit=3');
    console.log('Workflows endpoint status:', test.status);
    if (test.status !== 200) {
        console.log('Response:', test.body.substring(0, 300));
        return;
    }
    const wfList = JSON.parse(test.body);
    const workflows = wfList.data || wfList;
    if (Array.isArray(workflows)) {
        console.log('Available workflows:');
        workflows.forEach(w => console.log(' -', w.id, '|', w.name));
    }

    // Now fetch executions
    console.log('\nFetching executions for workflow:', WORKFLOW_ID);
    const res = await n8nGet(`/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=5`);
    console.log('Executions status:', res.status);

    if (res.status !== 200) {
        console.log('Response:', res.body.substring(0, 400));
        return;
    }

    const data = JSON.parse(res.body);
    const executions = data.data || data;

    if (!Array.isArray(executions) || executions.length === 0) {
        console.log('No executions found.');
        return;
    }

    console.log(`\nFound ${executions.length} executions:`);
    executions.forEach((e, i) => {
        console.log(`[${i+1}] ID: ${e.id} | Status: ${e.status} | Started: ${e.startedAt}`);
    });

    // Pull detail for last 2 successful ones
    const successful = executions.filter(e => e.status === 'success').slice(0, 2);
    if (successful.length === 0) {
        console.log('\nNo successful executions found. Pulling last 2 regardless:');
        successful.push(...executions.slice(0, 2));
    }

    for (const exec of successful) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`EXECUTION ${exec.id} | ${exec.status} | ${exec.startedAt}`);
        console.log('='.repeat(60));

        const detail = await n8nGet(`/api/v1/executions/${exec.id}?includeData=true`);
        if (detail.status !== 200) {
            console.log('Could not fetch:', detail.body.substring(0, 200));
            continue;
        }

        const ex = JSON.parse(detail.body);
        const runData = ex.data?.resultData?.runData || {};
        const nodes = Object.keys(runData);
        console.log('Nodes executed:', nodes.length);

        // Get webhook input
        const wh = runData['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json;
        if (wh) {
            const body = wh.body || wh;
            console.log('Title:', body.title || 'unknown');
            console.log('Client:', body.client_name || 'unknown');
            console.log('Word count:', body.word_count || 'unknown');
            console.log('Is revision:', body.is_revision || false);
        }

        // Try to find article content in any output node
        const outputCandidates = [
            'Document Export Sanitization5',
            'Claude Final SEO Snippet Optimization',
            'Claude Humanised Readability Rewrite',
            'Claude NLP & PR Optimization',
            'Create a document17',
            'Update a document17'
        ];

        for (const candidate of outputCandidates) {
            const nd = runData[candidate];
            if (!nd) continue;
            const json = nd[0]?.data?.main?.[0]?.[0]?.json || {};
            const txt = json.content || json.text || json.output || (json.choices?.[0]?.message?.content) || '';
            if (typeof txt === 'string' && txt.length > 200) {
                console.log(`\n--- OUTPUT from "${candidate}" (first 3000 chars) ---`);
                console.log(txt.substring(0, 3000));
                fs.writeFileSync(`scratch/exec_${exec.id}_output.txt`, txt);
                console.log(`\n✅ Full article saved → scratch/exec_${exec.id}_output.txt`);
                break;
            }
        }

        console.log('\nAll nodes that ran:', nodes.join(' → '));
    }
}

main().catch(e => console.error('Fatal:', e.message, e.stack));
