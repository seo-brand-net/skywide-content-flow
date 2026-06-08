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
    const prodWorkflowId = 'VFhDwJdeUz1If1GV';
    
    // Fetch last 15 executions for PROD workflow
    const exRes = await fetch(N8N_BASE_URL + '/api/v1/executions?workflowId=' + prodWorkflowId + '&limit=15&includeData=false', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());

    const execs = exRes.data || [];
    
    for (const exec of execs) {
        if (exec.status === 'running') continue;

        const eRes = await fetch(N8N_BASE_URL + '/api/v1/executions/' + exec.id + '?includeData=true', {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        }).then(r => r.json());
        
        const rd = eRes.data?.resultData?.runData || {};
        
        // Find webhook to check client
        let clientName = '';
        let title = '';
        for (const nodeName of Object.keys(rd)) {
            if (nodeName.includes('Webhook')) {
                for (const nodeRun of rd[nodeName] || []) {
                    const d = nodeRun?.data?.main?.[0]?.[0]?.json;
                    if (!d) continue;
                    const body = d?.body || d || {};
                    if (body.client_name) {
                        clientName = body.client_name;
                        title = body.article_title || '';
                        break;
                    }
                }
            }
        }

        if (clientName && clientName.toLowerCase().includes('ridge')) {
            console.log('\n=== EXECUTION', exec.id, '(', exec.status, ') ===');
            console.log('Client:', clientName);
            console.log('Title:', title);
            
            // Check output lengths at each stage
            const stages = [
                'Claude Draft (Claude Opus 3)1',
                'Claude Apply Recommendations1',
                'Claude EEAT Injection1',
                'Claude NLP & PR Optimization',
                'Claude Humanised Readability Rewrite',
                'Claude Final SEO Snippet Optimization'
            ];

            for (const stage of stages) {
                const nodeRuns = rd[stage] || [];
                for (let i = 0; i < nodeRuns.length; i++) {
                    const d = nodeRuns[i]?.data?.main?.[0]?.[0]?.json;
                    const text = extractText(d);
                    if (text && text.length > 200) {
                        const words = text.replace(/[#*_\-]/g, '').split(/\s+/).filter(w => w.length > 0).length;
                        console.log(`  ${stage} (run ${i}): ${words} words`);
                        
                        // If it's the final stage, check for the issue
                        if (stage === 'Claude Humanised Readability Rewrite') {
                            if (text.includes('When Residential Treatment Is the Right Level of Care')) {
                                console.log('  ⚠️ Contains the section Billy mentioned!');
                                const last100 = text.substring(text.length - 200);
                                console.log(`  End of text snippet: ...${last100}`);
                            }
                            
                            // Check for the fabricated attributions
                            const issues = ['consistently see success when', 'typically incorporate', 'consistently shows', 'American Psychological Association'];
                            issues.forEach(issue => {
                                if (text.includes(issue)) {
                                    console.log(`  ⚠️ Fabricated phrase found: "${issue}"`);
                                }
                            });
                        }
                    }
                }
            }
        }
    }
}
run().catch(console.error);
