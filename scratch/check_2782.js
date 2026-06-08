require('dotenv').config();
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

function extractText(json) {
    return json?.text || json?.content || json?.message?.content
        || json?.choices?.[0]?.message?.content || '';
}

async function run() {
    const execId = 2782;
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/' + execId + '?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());

    const rd = res.data?.resultData?.runData || {};

    // Dump all node names and what they produced so we can identify the client
    console.log('=== EXECUTION', execId, '— STATUS:', res.status, '===\n');
    
    // Check webhook for the brief
    for (let runIdx = 0; runIdx <= 3; runIdx++) {
        const wh = rd['Webhook1']?.[runIdx]?.data?.main?.[0]?.[0]?.json;
        if (wh) {
            const body = wh.body || wh;
            console.log('WEBHOOK (run', runIdx, '):');
            console.log('  client_name:', body.client_name);
            console.log('  article_title:', body.article_title);
            console.log('  client_website_url:', body.client_website_url);
            console.log('  word_count:', body.word_count);
            console.log('');
        }
    }

    // Find the final article output - check multiple possible node names
    const finalNodes = [
        'Claude Final SEO Snippet Optimization',
        'Claude Humanised Readability Rewrite',
        'Claude NLP & PR Optimization',
        'Claude EEAT Injection1',
        'Claude Apply Recommendations1',
    ];

    for (const nodeName of finalNodes) {
        for (let runIdx = 0; runIdx <= 5; runIdx++) {
            const nodeData = rd[nodeName]?.[runIdx]?.data?.main?.[0]?.[0]?.json;
            if (nodeData) {
                const text = extractText(nodeData);
                if (text && text.length > 100) {
                    console.log('=== FINAL OUTPUT from:', nodeName, '(run', runIdx, ') ===');
                    console.log(text.substring(0, 3000));
                    console.log('\n... [truncated, total length:', text.length, 'chars]\n');
                    break;
                }
            }
        }
    }
}
run().catch(console.error);
