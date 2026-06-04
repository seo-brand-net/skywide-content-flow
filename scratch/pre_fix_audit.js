const fs = require('fs');
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

async function run() {
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2781?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());
    const rd = res.data?.resultData?.runData || {};

    const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

    // ---- 1. Restore Retry Count1 current params ----
    const rrc = wf.nodes.find(n => n.name === 'Restore Retry Count1');
    console.log('=== RESTORE RETRY COUNT1 PARAMS ===');
    console.log(JSON.stringify(rrc.parameters, null, 2));

    // ---- 2. QA Rewriter Agent1 output structure from execution ----
    console.log('\n=== QA REWRITER AGENT1 ACTUAL OUTPUT STRUCTURE ===');
    const qaRun = rd['QA Rewriter Agent1']?.[0]?.data?.main?.[0]?.[0]?.json || {};
    console.log('Keys:', Object.keys(qaRun).join(', '));
    if (qaRun.message) console.log('message keys:', Object.keys(qaRun.message));
    if (qaRun.choices) {
        console.log('choices[0] keys:', Object.keys(qaRun.choices[0]));
        console.log('content snippet:', qaRun.choices[0]?.message?.content?.substring(0, 200));
    }

    // ---- 3. Claude Apply Recommendations prompt ----
    const car = wf.nodes.find(n => n.name === 'Claude Apply Recommendations1');
    console.log('\n=== CLAUDE APPLY RECOMMENDATIONS1 — PROMPT SNIPPET ===');
    const carPrompt = JSON.stringify(car?.parameters?.messages || car?.parameters);
    console.log(carPrompt.substring(0, 1500));

    // ---- 4. Claude EEAT Injection prompt ----
    const eeat = wf.nodes.find(n => n.name === 'Claude EEAT Injection1');
    console.log('\n=== CLAUDE EEAT INJECTION1 — PROMPT SNIPPET ===');
    const eeatPrompt = JSON.stringify(eeat?.parameters?.messages || eeat?.parameters);
    console.log(eeatPrompt.substring(0, 1500));

    // ---- 5. Data Check & Research Gaps1 — user message ----
    const dc = wf.nodes.find(n => n.name === 'Data Check & Research Gaps1');
    const dcMsg = dc?.parameters?.messages?.message;
    console.log('\n=== DATA CHECK & RESEARCH GAPS1 — USER MESSAGE ===');
    if (dcMsg) {
        dcMsg.forEach((m, i) => console.log(`Message ${i} (${m.role || 'user'}): ${JSON.stringify(m.content).substring(0, 800)}`));
    }

    // ---- 6. Post-Draft Fact Checker output structure ----
    console.log('\n=== POST-DRAFT FACT CHECKER ACTUAL OUTPUT ===');
    const pdfc = rd['Post-Draft Fact Checker']?.[2]?.data?.main?.[0]?.[0]?.json || {};
    console.log('Keys:', Object.keys(pdfc).join(', '));
    const pdText = pdfc.choices?.[0]?.message?.content || pdfc.text || pdfc.content || '';
    console.log('Content snippet:', pdText.substring(0, 600));

    // ---- 7. Claude Draft node — full parameter structure ----
    const cdNode = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
    console.log('\n=== CLAUDE DRAFT — WHAT IT REFERENCES ===');
    const cdPrompt = JSON.stringify(cdNode.parameters);
    const refs = cdPrompt.match(/\$\(['"][^'"]+['"]\)/g) || [];
    const uniqueRefs = [...new Set(refs)];
    uniqueRefs.forEach(r => console.log('  ', r));

    // ---- 8. If1/If2/If3 conditions ----
    ['If1', 'If2', 'If3'].forEach(name => {
        const n = wf.nodes.find(x => x.name === name);
        if (!n) return;
        console.log('\n=== ' + name + ' CONDITIONS ===');
        console.log(JSON.stringify(n.parameters.conditions.conditions, null, 2));
    });
}
run().catch(console.error);
