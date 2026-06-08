require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

function extractText(json) {
    if (!json) return '';
    const t = json?.text || json?.content || json?.message?.content || json?.choices?.[0]?.message?.content || '';
    return typeof t === 'string' ? t : JSON.stringify(t);
}

async function fetchExecutionsForDateRange(startDate, endDate, limit = 5) {
    const { data: runs } = await supabase
        .from('content_runs')
        .select('n8n_execution_id, created_at, content_requests(client_name)')
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .not('n8n_execution_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (!runs) return [];

    let results = [];
    for (const run of runs) {
        try {
            const eRes = await fetch(`${N8N_BASE_URL}/api/v1/executions/${run.n8n_execution_id}?includeData=true`, {
                headers: { 'X-N8N-API-KEY': N8N_API_KEY }
            });
            if (!eRes.ok) continue;
            const data = await eRes.json();
            results.push({ run, exec: data.data });
        } catch (e) { }
    }
    return results;
}

async function analyze() {
    const periods = [
        { name: "Phase 1: Structure Enforcements", start: '2026-05-26T00:00:00Z', end: '2026-05-28T00:00:00Z' },
        { name: "Phase 2: Fact-Checking/Perplexity", start: '2026-05-29T00:00:00Z', end: '2026-06-02T00:00:00Z' },
        { name: "Phase 3: EEAT Anti-Hallucination", start: '2026-06-03T00:00:00Z', end: '2026-06-05T00:00:00Z' },
        { name: "Phase 4: Truncation Bugs", start: '2026-06-05T00:00:00Z', end: '2026-06-08T00:00:00Z' }
    ];

    let report = '=== HISTORICAL EXECUTION ANALYSIS ===\n';

    for (const period of periods) {
        report += `\n\n--- ${period.name} (${period.start} to ${period.end}) ---\n`;
        const executions = await fetchExecutionsForDateRange(period.start, period.end, 3);
        
        for (const { run, exec } of executions) {
            const clientName = run.content_requests?.client_name || 'Unknown';
            report += `\nExec ${run.n8n_execution_id} | Client: ${clientName} | Date: ${run.created_at}\n`;
            
            const rd = exec?.resultData?.runData || {};
            const nodesToCheck = [
                'Claude Draft (Claude Opus 3)1', 
                'Surgical Rewriter', 
                'Claude Apply Recommendations1', 
                'Claude EEAT Injection1'
            ];

            for (const node of nodesToCheck) {
                if (!rd[node]) continue;
                const nodeRuns = rd[node];
                for (let i = 0; i < nodeRuns.length; i++) {
                    const text = extractText(nodeRuns[i]?.data?.main?.[0]?.[0]?.json);
                    if (text && text.length > 100) {
                        const words = text.split(/\s+/).length;
                        const endsWithPunctuation = /[.!?]"?$/.test(text.trim());
                        const hasNumbers = /\d{2,}%/.test(text); // Check for percentage hallucinations
                        const hasAPA = /American Psychological Association/.test(text);
                        
                        report += `  - ${node} (Run ${i}): ${words} words. ` +
                                  `Truncated? ${!endsWithPunctuation}. ` +
                                  `Has % Stats? ${hasNumbers}. ` +
                                  `Has APA mention? ${hasAPA}.\n`;
                    }
                }
            }
        }
    }

    fs.writeFileSync('scratch/historical_executions.txt', report);
    console.log('Analysis saved to scratch/historical_executions.txt');
}

analyze().catch(console.error);
