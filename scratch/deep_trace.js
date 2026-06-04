const fs = require('fs');
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

async function deepTrace() {
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2781?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());

    const runData = res.data?.resultData?.runData || {};

    // ---- 1. What does If1 actually SEE? (its input json) ----
    console.log('=== IF1 — WHAT IT SEES EACH RUN ===');
    const if1 = runData['If1'];
    if (if1) {
        if1.forEach((run, i) => {
            const item = run.data?.main?.[0]?.[0]?.json || {};
            console.log(`Run ${i+1}: keys=${Object.keys(item).join(', ')} | runs=${item.runs}`);
        });
    }

    // ---- 2. What does Max Iterations1 actually produce? ----
    console.log('\n=== MAX ITERATIONS1 — FULL OUTPUT EACH RUN ===');
    const maxIt = runData['Max Iterations1'];
    if (maxIt) {
        maxIt.forEach((run, i) => {
            const item = run.data?.main?.[0]?.[0]?.json || {};
            console.log(`Run ${i+1}:`, JSON.stringify(item));
        });
    }

    // ---- 3. What does Edit Fields2 produce (feeds into Edit Fields3 / AI Agent1)? ----
    console.log('\n=== EDIT FIELDS2 — OUTPUT EACH RUN ===');
    const ef2 = runData['Edit Fields2'];
    if (ef2) {
        ef2.forEach((run, i) => {
            const item = run.data?.main?.[0]?.[0]?.json || {};
            console.log(`Run ${i+1}: keys=${Object.keys(item).join(', ')} | retryCount=${item.retryCount} | runs=${item.runs} | maxIterations=${item.maxIterations}`);
        });
    }

    // ---- 4. What does AI Agent1 actually output (passed field)? ----
    console.log('\n=== AI AGENT1 — RAW OUTPUT EACH RUN ===');
    const ai1 = runData['AI Agent1'];
    if (ai1) {
        ai1.forEach((run, i) => {
            const item = run.data?.main?.[0]?.[0]?.json || {};
            console.log(`Run ${i+1}: keys=${Object.keys(item).join(', ')}`);
            if (item.output) {
                console.log(`  output.passed=${item.output.passed} (type: ${typeof item.output.passed})`);
                console.log(`  output keys: ${Object.keys(item.output).join(', ')}`);
            }
            console.log(`  runs=${item.runs} | retryCount=${item.retryCount}`);
        });
    }

    // ---- 5. What does Restore Retry Count1 produce? ----
    console.log('\n=== RESTORE RETRY COUNT1 — OUTPUT ===');
    const restore = runData['Restore Retry Count1'];
    if (restore) {
        restore.forEach((run, i) => {
            const item = run.data?.main?.[0]?.[0]?.json || {};
            console.log(`Run ${i+1}:`, JSON.stringify(item));
        });
    }

    // ---- 6. What does QA Rewriter Agent1 actually produce? ----
    console.log('\n=== QA REWRITER AGENT1 — RAW OUTPUT ===');
    const qa = runData['QA Rewriter Agent1'];
    if (qa) {
        qa.forEach((run, i) => {
            const item = run.data?.main?.[0]?.[0]?.json || {};
            console.log(`Run ${i+1}: keys=${Object.keys(item).join(', ')}`);
            if (item.output) console.log(`  output keys:`, Object.keys(item.output));
            const contentLen = (item.output?.content ?? item.text ?? item.content ?? '').length;
            console.log(`  content_length=${contentLen}`);
        });
    }
}

deepTrace().catch(console.error);
