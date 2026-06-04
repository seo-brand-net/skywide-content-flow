const fs = require('fs');
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

async function traceLoop() {
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2781?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());

    const runData = res.data?.resultData?.runData || {};

    // Nodes we want to trace in order through the QA loop
    const traceNodes = [
        'Data Check & Research Gaps1',  // initial merge/review
        'Edit Fields3',                  // passes content into QA
        'AI Agent1',                     // QA Checker (runs multiple times)
        'If1',                           // passes or loops
        'Max Iterations1',               // counter
        'QA Rewriter Agent1',            // rewrites if failed
        'Document Export Sanitization4', // final export
    ];

    console.log('=== EXECUTION 2781 — FULL DOWNSTREAM TRACE ===\n');

    traceNodes.forEach(name => {
        const nodeRuns = runData[name];
        if (!nodeRuns) {
            console.log(`[${name}] — NOT RUN\n`);
            return;
        }

        console.log(`[${name}] — ran ${nodeRuns.length} time(s)`);

        nodeRuns.forEach((run, i) => {
            const items = run.data?.main?.[0] || [];
            items.forEach((item, j) => {
                const json = item.json || {};

                // For AI Agent1 — show passed, validation_issues
                if (name === 'AI Agent1') {
                    const passed = json.output?.passed ?? json.passed ?? '?';
                    const issues = json.output?.validation_issues ?? json.validation_issues ?? '';
                    const contentLen = (json.output?.content ?? json.content ?? '').length;
                    console.log(`  Run ${i+1}: passed=${passed} | content_length=${contentLen}`);
                    if (issues) console.log(`    Issues: ${issues.substring(0, 300)}`);
                }
                // For If1 — show what condition fired
                else if (name === 'If1') {
                    console.log(`  Run ${i+1}: json keys = ${Object.keys(json).join(', ')}`);
                    console.log(`    retryCount=${json.retryCount} | runs=${json.runs} | output.passed=${json.output?.passed}`);
                }
                // For Max Iterations1
                else if (name === 'Max Iterations1') {
                    console.log(`  Run ${i+1}: retryCount=${json.retryCount} | maxIterations=${json.maxIterations}`);
                }
                // For QA Rewriter Agent1 — show content length before/after
                else if (name === 'QA Rewriter Agent1') {
                    const contentLen = (json.output?.content ?? json.text ?? json.content ?? '').length;
                    console.log(`  Run ${i+1}: output_length=${contentLen}`);
                }
                // For Edit Fields3
                else if (name === 'Edit Fields3') {
                    const contentLen = (json.documentContent ?? '').length;
                    console.log(`  Run ${i+1}: documentContent_length=${contentLen}`);
                }
                // For Data Check & Research Gaps1
                else if (name === 'Data Check & Research Gaps1') {
                    const contentLen = (json.text ?? json.content ?? '').length;
                    console.log(`  Run ${i+1}: output_length=${contentLen} | keys=${Object.keys(json).join(', ')}`);
                }
                // For Document Export Sanitization4
                else if (name === 'Document Export Sanitization4') {
                    const contentLen = (json.text ?? json.content ?? '').length;
                    console.log(`  Run ${i+1}: final_output_length=${contentLen}`);
                }
            });
        });
        console.log('');
    });

    // Also dump all node names that ran so we can see the full flow
    console.log('=== ALL NODES THAT RAN (in order) ===');
    const allNodeNames = Object.entries(runData).map(([name, runs]) => `${name} (x${runs.length})`);
    console.log(allNodeNames.join('\n'));
}

traceLoop().catch(console.error);
