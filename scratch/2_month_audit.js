require('dotenv').config();
const fs = require('fs');
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

function extractText(json) {
    if (!json) return '';
    const t = json?.text || json?.content || json?.message?.content || json?.choices?.[0]?.message?.content || '';
    return typeof t === 'string' ? t : JSON.stringify(t);
}

async function deepAudit() {
    console.log('Fetching all workflows...');
    const wfRes = await fetch(N8N_BASE_URL + '/api/v1/workflows', { headers: { 'X-N8N-API-KEY': N8N_API_KEY } });
    const wfData = await wfRes.json();
    const contentWfIds = wfData.data
        .filter(w => w.name.toLowerCase().includes('content') || w.name.toLowerCase().includes('skywide'))
        .map(w => w.id);

    console.log(`Found ${contentWfIds.length} related workflows. Fetching global executions...`);

    let allExecs = [];
    let lastId = null;

    for (let page = 0; page < 10; page++) { // fetch 200 executions back in time
        let url = `${N8N_BASE_URL}/api/v1/executions?limit=20&includeData=false`;
        if (lastId) url += `&lastId=${lastId}`;

        try {
            const res = await fetch(url, { headers: { 'X-N8N-API-KEY': N8N_API_KEY } });
            if (!res.ok) break;
            const data = await res.json();
            if (!data.data || data.data.length === 0) break;
            
            // Filter only to content workflows
            const validExecs = data.data.filter(e => contentWfIds.includes(e.workflowId) && e.status !== 'running');
            allExecs = allExecs.concat(validExecs);
            lastId = data.data[data.data.length - 1].id;
        } catch (e) {
            console.error('Fetch error:', e);
            break;
        }
    }

    console.log(`Found ${allExecs.length} content executions. Analyzing...`);

    // Sort oldest to newest
    allExecs.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

    let report = '=== 2-MONTH DEEP EXECUTION AUDIT (April to June) ===\n\n';
    
    let analyzedCount = 0;

    for (const exec of allExecs) {
        try {
            const eRes = await fetch(`${N8N_BASE_URL}/api/v1/executions/${exec.id}?includeData=true`, {
                headers: { 'X-N8N-API-KEY': N8N_API_KEY }
            });
            if (!eRes.ok) continue;
            const details = await eRes.json();
            const rd = details.data?.resultData?.runData || {};
            
            // Look for any Claude or OpenAI node that might represent drafting
            let draftNodes = Object.keys(rd).filter(k => k.toLowerCase().includes('claude') || k.toLowerCase().includes('openai') || k.toLowerCase().includes('rewriter'));
            
            if (draftNodes.length === 0) continue;

            const startedAt = new Date(exec.startedAt);
            const month = startedAt.toLocaleString('default', { month: 'long' });
            
            report += `\n----------------------------------------\n`;
            report += `[${month} ${startedAt.getDate()}] Exec: ${exec.id} | Workflow: ${exec.workflowId}\n`;

            let hasTruncation = false;
            let hasNumberHallucinations = false;
            let hasPractitionerHallucinations = false;
            let maxWords = 0;

            for (const node of draftNodes) {
                const nodeRuns = rd[node];
                for (let i = 0; i < nodeRuns.length; i++) {
                    const text = extractText(nodeRuns[i]?.data?.main?.[0]?.[0]?.json);
                    if (text && text.length > 200) {
                        const words = text.split(/\s+/).length;
                        if (words > maxWords) maxWords = words;

                        const endsWithPunctuation = /[.!?]"?$/.test(text.trim());
                        if (!endsWithPunctuation) hasTruncation = true;

                        if (/\d{2,}%/.test(text)) hasNumberHallucinations = true;
                        if (/American Psychological Association/.test(text) || /practitioners consistently see/i.test(text) || /clinical experience shows/i.test(text)) hasPractitionerHallucinations = true;
                    }
                }
            }

            report += `Max Length: ${maxWords} words | Truncated: ${hasTruncation} | Has % Stats: ${hasNumberHallucinations} | Has Practitioner Claims: ${hasPractitionerHallucinations}\n`;
            analyzedCount++;
        } catch (e) { }
    }

    report = `Analyzed ${analyzedCount} executions across the 2-month history.\n\n` + report;
    fs.writeFileSync('scratch/2_month_audit.txt', report);
    console.log('Deep audit saved to scratch/2_month_audit.txt');
}

deepAudit().catch(console.error);
