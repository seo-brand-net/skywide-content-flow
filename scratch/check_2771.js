require('dotenv').config();
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

function extractText(json) {
    return json?.text || json?.content || json?.message?.content
        || json?.choices?.[0]?.message?.content || '';
}

async function run() {
    // Check 2771 which showed "unknown" client earlier
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2771?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());

    const rd = res.data?.resultData?.runData || {};
    const allNodes = Object.keys(rd);
    console.log('=== EXECUTION 2771 — STATUS:', res.status, '===');
    console.log('Nodes present:', allNodes.join(', '), '\n');

    // Try to find webhook data across all run indices
    for (const nodeName of allNodes) {
        const nodeRuns = rd[nodeName];
        for (let i = 0; i < nodeRuns.length; i++) {
            const d = nodeRuns[i]?.data?.main?.[0]?.[0]?.json;
            if (!d) continue;
            const body = d.body || d;
            if (body.client_name || body.article_title || body.client_website_url) {
                console.log('CLIENT FOUND in node:', nodeName, '(run', i, ')');
                console.log('  client_name:', body.client_name);
                console.log('  article_title:', body.article_title);
                console.log('  client_website_url:', body.client_website_url);
                console.log('  word_count:', body.word_count);
                console.log('');
            }
        }
    }

    // Also pull the last meaningful article text
    const outputNodes = [
        'Claude Final SEO Snippet Optimization',
        'Claude Humanised Readability Rewrite',
        'Claude NLP & PR Optimization',
        'Claude EEAT Injection1',
        'Claude Apply Recommendations1',
        'Claude Draft (Claude Opus 3)1',
    ];

    for (const nodeName of outputNodes) {
        for (let i = 0; i <= 5; i++) {
            const d = rd[nodeName]?.[i]?.data?.main?.[0]?.[0]?.json;
            if (!d) continue;
            const text = extractText(d);
            if (text && text.length > 200) {
                console.log('=== ARTICLE from:', nodeName, '(run', i, ') — length:', text.length, '===');
                console.log(text.substring(0, 500));
                console.log('...\n');
                break;
            }
        }
    }
}
run().catch(console.error);
