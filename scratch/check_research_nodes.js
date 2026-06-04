const fs = require('fs');
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

function extractText(json) {
    return json?.text
        || json?.content
        || json?.message?.content
        || json?.choices?.[0]?.message?.content
        || json?.output?.content
        || JSON.stringify(json).substring(0, 500);
}

async function run() {
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2781?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());
    const rd = res.data?.resultData?.runData || {};

    const nodes = [
        'Client Site Researcher',
        'Client Profile Extractor',
        'Pre-Draft Fact Checker',
        'Keyword Strategist',
        'Post-Draft Fact Checker',
    ];

    for (const name of nodes) {
        const runs = rd[name];
        if (!runs) { console.log(`\n[${name}] — NOT RUN\n`); continue; }

        console.log(`\n${'='.repeat(70)}`);
        console.log(`NODE: ${name} — ran ${runs.length} time(s)`);
        console.log('='.repeat(70));

        runs.forEach((run, i) => {
            const item = run.data?.main?.[0]?.[0]?.json || {};
            const text = extractText(item);
            console.log(`\n  --- Run ${i+1} ---`);
            console.log(`  Keys: ${Object.keys(item).join(', ')}`);
            // Print full content for these nodes
            console.log('\n' + text.substring(0, 3000));
            if (text.length > 3000) console.log(`  ... [truncated, total ${text.length} chars]`);
        });
    }

    // Also: check where Pre-Draft Fact Checker output gets used 
    // by looking at what Data Check & Research Gaps1 sees as input
    console.log(`\n${'='.repeat(70)}`);
    console.log('DATA CHECK & RESEARCH GAPS1 — FULL PROMPT INPUT CHECK');
    console.log('='.repeat(70));
    const dc = rd['Data Check & Research Gaps1'];
    if (dc && dc[0]) {
        const json = dc[0].data?.main?.[0]?.[0]?.json || {};
        const text = extractText(json);
        console.log('Keys:', Object.keys(json).join(', '));
        console.log('\nFirst 3000 chars of output:');
        console.log(text.substring(0, 3000));
    }
}
run().catch(console.error);
