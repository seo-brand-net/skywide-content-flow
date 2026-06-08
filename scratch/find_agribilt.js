require('dotenv').config();
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

function extractText(json) {
    if (!json) return '';
    const t = json?.text || json?.content || json?.message?.content
        || json?.choices?.[0]?.message?.content || '';
    return typeof t === 'string' ? t : JSON.stringify(t);
}

async function run() {
    // Check the DEV Blog workflow (TR6UPVmzwY1iWItn) and the main DEV workflow (t3LNiuZIghvobde3)
    const workflows = [
        { id: 'TR6UPVmzwY1iWItn', name: 'DEV Blog - No OpenAI Draft' },
        { id: 't3LNiuZIghvobde3', name: 'DEV Skywide Content (main)' },
        { id: 'hwBlBjLm40yqtIX9', name: 'TEST Skywide Content (Prompt Review)' },
    ];

    for (const wf of workflows) {
        console.log('\n=== Workflow:', wf.name, '(' + wf.id + ') ===');
        const exRes = await fetch(N8N_BASE_URL + '/api/v1/executions?workflowId=' + wf.id + '&limit=5&includeData=false', {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        }).then(r => r.json());

        const execs = exRes.data || [];
        if (execs.length === 0) { console.log('  No executions found'); continue; }
        
        execs.forEach(e => console.log('  ID:', e.id, '| Status:', e.status, '| Started:', e.startedAt));

        // Peek into the most recent one
        const latest = execs[0];
        const eRes = await fetch(N8N_BASE_URL + '/api/v1/executions/' + latest.id + '?includeData=true', {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        }).then(r => r.json());

        const rd = eRes.data?.resultData?.runData || {};
        for (const nodeName of Object.keys(rd)) {
            for (const nodeRun of (rd[nodeName] || [])) {
                const d = nodeRun?.data?.main?.[0]?.[0]?.json;
                const body = d?.body || d || {};
                const client = String(body.client_name || '');
                const title = String(body.article_title || '');
                if (client || title) {
                    console.log('  Latest exec client:', client, '| title:', title, '| website:', body.client_website_url || '');
                    break;
                }
            }
        }
    }
}
run().catch(console.error);
