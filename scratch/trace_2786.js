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
    const execId = '2786';
    const eRes = await fetch(N8N_BASE_URL + '/api/v1/executions/' + execId + '?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());
    
    const rd = eRes.data?.resultData?.runData || {};
    
    const stages = [
        'Claude Draft (Claude Opus 3)1',
        'Claude Apply Recommendations1',
        'Claude EEAT Injection1',
        'Claude NLP & PR Optimization',
        'Claude Humanised Readability Rewrite',
        'Claude Final SEO Snippet Optimization'
    ];

    console.log('=== EXECUTION 2786 TRACE ===');
    for (const stage of stages) {
        const nodeRuns = rd[stage] || [];
        for (let i = 0; i < nodeRuns.length; i++) {
            const d = nodeRuns[i]?.data?.main?.[0]?.[0]?.json;
            const text = extractText(d);
            if (text && text.length > 200) {
                const words = text.replace(/[#*_\-]/g, '').split(/\s+/).filter(w => w.length > 0).length;
                console.log(`\n[Stage] ${stage} (run ${i}): ${words} words, ${text.length} chars`);
                
                // Show end of text to see if it's truncated
                const endSnippet = text.substring(text.length - 200).replace(/\n/g, ' ');
                console.log(`  Ends with: "...${endSnippet}"`);
            }
        }
    }
}
run().catch(console.error);
