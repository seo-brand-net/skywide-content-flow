const fs = require('fs');
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

async function run() {
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2781?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());
    const runData = res.data?.resultData?.runData || {};

    // Trace AI Agent1 each run fully
    console.log('=== AI AGENT1 — ALL RUNS — FULL ===\n');
    const aiRuns = runData['AI Agent1'] || [];
    aiRuns.forEach((run, i) => {
        const item = run.data?.main?.[0]?.[0]?.json || {};
        console.log(`--- Run ${i+1} ---`);
        console.log('  Keys:', Object.keys(item).join(', '));
        if (item.output) {
            console.log('  output.passed:', item.output.passed, '(type:', typeof item.output.passed, ')');
            console.log('  output.content (first 200):', (item.output.content || '').substring(0, 200));
        }
        // Check if passed is at root level
        if (item.passed !== undefined) console.log('  root.passed:', item.passed);
        // Check runs/retryCount
        console.log('  runs:', item.runs, '| retryCount:', item.retryCount);
        console.log('');
    });

    // Trace If1 — what is it actually evaluating?
    console.log('\n=== IF1 — ALL RUNS — FULL ===\n');
    const if1runs = runData['If1'] || [];
    if1runs.forEach((run, i) => {
        // If node doesn't output to main — check both output branches
        const trueOut = run.data?.main?.[0]?.[0]?.json;
        const falseOut = run.data?.main?.[1]?.[0]?.json;
        console.log(`--- Run ${i+1} ---`);
        console.log('  true branch item:', JSON.stringify(trueOut));
        console.log('  false branch item:', JSON.stringify(falseOut));
        console.log('  full data keys:', Object.keys(run.data || {}).join(', '));
    });

    // Trace Edit Fields3 — what gets passed into AI Agent1 each time?
    console.log('\n=== EDIT FIELDS3 — ALL RUNS — documentContent FIRST 300 CHARS ===\n');
    const ef3runs = runData['Edit Fields3'] || [];
    ef3runs.forEach((run, i) => {
        const item = run.data?.main?.[0]?.[0]?.json || {};
        const content = item.documentContent || '';
        console.log(`Run ${i+1} (len=${content.length}): ${content.substring(0, 300)}`);
        console.log('');
    });
}
run().catch(console.error);
