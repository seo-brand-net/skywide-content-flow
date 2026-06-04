const fs = require('fs');
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

function extractText(json) {
    return json?.text || json?.content || json?.message?.content
        || json?.choices?.[0]?.message?.content || '';
}

async function run() {
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2781?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());
    const rd = res.data?.resultData?.runData || {};

    const stageNodes = [
        { name: 'Claude Draft (Claude Opus 3)1',        run: 1, label: 'Claude Draft' },
        { name: 'Data Check & Research Gaps1',           run: 2, label: 'Data Check' },
        { name: 'Claude Apply Recommendations1',         run: 2, label: 'Apply Recommendations' },
        { name: 'Claude EEAT Injection1',                run: 2, label: 'EEAT Injection' },
        { name: 'Claude NLP & PR Optimization',          run: 2, label: 'NLP & PR' },
        { name: 'Claude Humanised Readability Rewrite',  run: 2, label: 'Humanised Rewrite' },
        { name: 'Claude Final SEO Snippet Optimization', run: 2, label: 'Final SEO Snippet' },
    ];

    const texts = stageNodes.map(s => ({
        label: s.label,
        text: extractText(rd[s.name]?.[s.run]?.data?.main?.[0]?.[0]?.json || {})
    }));

    const suspectClaims = [
        '67%',
        'over 50 years',
        'spanning over',
        'spanning decades',
        'thousands of',
        'clinical experience across',
        'treatment providers',
        'documented across',
        'autism research centers',
        'university autism centers',
        'research centers is pretty clear',
        '40+',
        'longitudinal research',
    ];

    console.log('=== WHERE EACH SUSPECT CLAIM FIRST APPEARS ===\n');
    suspectClaims.forEach(claim => {
        let firstSeen = null;
        for (const stage of texts) {
            if (stage.text && stage.text.includes(claim)) {
                firstSeen = stage.label;
                break;
            }
        }
        const origin = firstSeen ? ('ORIGIN: ' + firstSeen) : 'NOT FOUND in pipeline';
        console.log(origin + ' | ' + claim);
    });

    // Also check the EEAT node prompt for its EEAT-specific instructions
    const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
    const eeatNode = wf.nodes.find(n => n.name === 'Claude EEAT Injection1');
    const msgArr = eeatNode?.parameters?.messages?.messageValues || [];
    const fullPrompt = msgArr.map(m => m.message || '').join('\n');

    console.log('\n\n=== EEAT PROMPT — WHAT IT IS TOLD TO DO (EEAT section) ===');
    const eeatStart = fullPrompt.indexOf('EEAT');
    if (eeatStart !== -1) {
        console.log(fullPrompt.substring(eeatStart, eeatStart + 2000));
    }
}
run().catch(console.error);
