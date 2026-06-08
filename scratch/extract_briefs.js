require('dotenv').config();
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';
const fs = require('fs');

async function run() {
    const prodWorkflowId = 'VFhDwJdeUz1If1GV';
    
    const exRes = await fetch(N8N_BASE_URL + '/api/v1/executions?workflowId=' + prodWorkflowId + '&limit=20&includeData=false', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());

    const execs = exRes.data || [];
    const successfulExecs = execs.filter(e => e.status === 'success');
    
    console.log(`Found ${successfulExecs.length} successful executions.`);
    
    let report = '';

    for (const exec of successfulExecs.slice(0, 10)) {
        const eRes = await fetch(N8N_BASE_URL + '/api/v1/executions/' + exec.id + '?includeData=true', {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        }).then(r => r.json());
        
        const rd = eRes.data?.resultData?.runData || {};
        
        let briefText = '';
        let clientName = '';
        
        for (const nodeName of Object.keys(rd)) {
            if (nodeName.includes('Webhook')) {
                for (const nodeRun of rd[nodeName] || []) {
                    const d = nodeRun?.data?.main?.[0]?.[0]?.json;
                    if (!d) continue;
                    const body = d?.body || d || {};
                    if (body.client_name) {
                        clientName = body.client_name;
                        briefText = body.brief || body.content_brief || body.creative_brief || '';
                        break;
                    }
                }
            }
        }
        
        if (clientName && briefText) {
            report += `\n========================================\n`;
            report += `CLIENT: ${clientName} (Exec ${exec.id})\n`;
            report += `========================================\n`;
            report += briefText + `\n`;
        }
    }
    
    fs.writeFileSync('scratch/briefs_analysis.txt', report);
    console.log('Saved brief texts to scratch/briefs_analysis.txt');
}

run().catch(console.error);
