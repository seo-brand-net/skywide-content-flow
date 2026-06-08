require('dotenv').config();
const fs = require('fs');
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';
const PROD_WORKFLOW_ID = 'VFhDwJdeUz1If1GV';

function extractText(json) {
    if (!json) return '';
    const t = json?.text || json?.content || json?.message?.content || json?.choices?.[0]?.message?.content || '';
    return typeof t === 'string' ? t : JSON.stringify(t);
}

async function deepDiveAnalysis() {
    console.log('Starting deep dive execution analysis (going back in time)...');
    let allExecs = [];
    let lastId = null;

    // Fetch up to 100 recent executions to get a good spread over the last month/two months
    for (let page = 0; page < 5; page++) {
        let url = `${N8N_BASE_URL}/api/v1/executions?workflowId=${PROD_WORKFLOW_ID}&limit=20&includeData=false`;
        if (lastId) url += `&lastId=${lastId}`;

        try {
            const res = await fetch(url, { headers: { 'X-N8N-API-KEY': N8N_API_KEY } });
            if (!res.ok) break;
            const data = await res.json();
            if (!data.data || data.data.length === 0) break;
            
            allExecs = allExecs.concat(data.data);
            lastId = data.data[data.data.length - 1].id;
        } catch (e) {
            console.error('Fetch error:', e);
            break;
        }
    }

    console.log(`Found ${allExecs.length} executions. Fetching details...`);

    let report = '=== N8N DEEP EXECUTION AUDIT (Oldest to Newest) ===\n\n';
    
    // Sort oldest to newest
    allExecs.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

    const nodesToCheck = [
        'Claude Draft (Claude Opus 3)1', 
        'Surgical Rewriter', 
        'Claude Apply Recommendations1', 
        'Claude EEAT Injection1'
    ];

    let analyzedCount = 0;
    
    for (const exec of allExecs) {
        if (exec.status === 'running' || exec.status === 'new') continue;

        try {
            const eRes = await fetch(`${N8N_BASE_URL}/api/v1/executions/${exec.id}?includeData=true`, {
                headers: { 'X-N8N-API-KEY': N8N_API_KEY }
            });
            if (!eRes.ok) continue;
            const details = await eRes.json();
            const rd = details.data?.resultData?.runData || {};
            
            // Check if any of our target nodes ran
            let hasTargetNodes = false;
            for (const n of nodesToCheck) if (rd[n]) hasTargetNodes = true;
            if (!hasTargetNodes) continue;

            report += `\n----------------------------------------\n`;
            report += `Execution: ${exec.id} | Status: ${exec.status} | Started: ${new Date(exec.startedAt).toISOString()}\n`;
            
            // Extract client name if possible
            let clientName = 'Unknown';
            for (const nodeName of Object.keys(rd)) {
                if (nodeName.includes('Webhook')) {
                    const d = rd[nodeName][0]?.data?.main?.[0]?.[0]?.json;
                    if (d?.body?.client_name) clientName = d.body.client_name;
                }
            }
            report += `Client: ${clientName}\n`;

            for (const node of nodesToCheck) {
                if (!rd[node]) continue;
                const nodeRuns = rd[node];
                
                report += `\n  [Node: ${node}] ran ${nodeRuns.length} times.\n`;
                
                for (let i = 0; i < nodeRuns.length; i++) {
                    const text = extractText(nodeRuns[i]?.data?.main?.[0]?.[0]?.json);
                    if (text && text.length > 100) {
                        const words = text.split(/\s+/).length;
                        const endsWithPunctuation = /[.!?]"?$/.test(text.trim());
                        
                        // Check specific hallucinations we discussed
                        const hasPercentages = /\d{2,}%/.test(text); 
                        const hasAPA = /American Psychological Association/.test(text) || /practitioners consistently see/i.test(text);
                        
                        report += `    Run ${i}: ${words} words | Truncated? ${!endsWithPunctuation} | Has % Stats? ${hasPercentages} | Has APA/Practitioner? ${hasAPA}\n`;
                    } else if (text) {
                        report += `    Run ${i}: Short output (${text.length} chars)\n`;
                    }
                }
            }
            analyzedCount++;
        } catch (e) { }
    }

    report = `Analyzed ${analyzedCount} deep executions.\n\n` + report;
    fs.writeFileSync('scratch/deep_n8n_audit.txt', report);
    console.log('Deep audit saved to scratch/deep_n8n_audit.txt');
}

deepDiveAnalysis().catch(console.error);
