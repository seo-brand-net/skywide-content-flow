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

    const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

    // Check whether Claude Draft references fact-checker nodes in its prompt
    const claudeDraftNode = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
    const claudePrompt = JSON.stringify(claudeDraftNode.parameters);

    console.log('=== DOES CLAUDE DRAFT REFERENCE RESEARCH NODES? ===');
    console.log('Pre-Draft Fact Checker:', claudePrompt.includes('Pre-Draft Fact Checker'));
    console.log('Client Profile Extractor:', claudePrompt.includes('Client Profile Extractor'));
    console.log('Client Site Researcher:', claudePrompt.includes('Client Site Researcher'));

    // Check Data Check node
    const dcNode = wf.nodes.find(n => n.name === 'Data Check & Research Gaps1');
    const dcPrompt = JSON.stringify(dcNode.parameters);
    console.log('\n=== DOES DATA CHECK REFERENCE FACT CHECKERS? ===');
    console.log('Pre-Draft Fact Checker:', dcPrompt.includes('Pre-Draft Fact Checker'));
    console.log('Post-Draft Fact Checker:', dcPrompt.includes('Post-Draft Fact Checker'));
    console.log('Client Profile Extractor:', dcPrompt.includes('Client Profile Extractor'));

    // Check Keyword Strategist output keys and preambles
    console.log('\n=== KEYWORD STRATEGIST OUTPUT (Run 1) ===');
    const ks = rd['Keyword Strategist'];
    if (ks) {
        const json = ks[0]?.data?.main?.[0]?.[0]?.json || {};
        console.log('Keys:', Object.keys(json).join(', '));
        const fields = ['brief_authority_preamble', 'brief_enforcer_injection', 'faq_injection', 'secondary_keyword_checklist'];
        fields.forEach(k => {
            const val = json[k] || '';
            console.log('\n  [' + k + '] (' + val.length + ' chars):');
            console.log('  ' + val.substring(0, 400));
        });
    }

    // Final article claim checks
    console.log('\n=== FINAL ARTICLE — FACT/CLIENT DATA PROPAGATION CHECK ===');
    const finalArticle = fs.readFileSync('scratch/latest_article.md', 'utf8');

    const checks = [
        { term: 'American Medical Association', expected: false, note: 'Should be REMOVED — AMA endorsement unverified' },
        { term: 'U.S. Surgeon General', expected: true, note: 'Verified — should appear' },
        { term: 'American Psychological Association', expected: true, note: 'Verified — should appear' },
        { term: 'operant conditioning', expected: true, note: 'Brief requires this foundational term' },
        { term: 'play-based', expected: true, note: 'Client site explicitly claims play-based therapy' },
        { term: 'in-home', expected: true, note: 'Client offers in-home therapy' },
        { term: 'in-clinic', expected: false, note: 'Client offers in-clinic therapy — should be present' },
        { term: 'Pennsylvania', expected: true, note: 'Client serves PA specifically' },
        { term: '100% accreditation', expected: true, note: 'Client claims 100% BHCOE accreditation' },
        { term: 'Little Hands', expected: false, note: 'Client-specific program not in article (editorial gap)' },
        { term: '67%', expected: false, note: 'Hallucinated stat — should NOT appear' },
        { term: '15', expected: true, note: '15-30 hrs/week from brief' },
        { term: 'B.F. Skinner', expected: false, note: 'Brief mentions Skinner for scientific grounding' },
        { term: 'Skinner', expected: false, note: 'Historical attribution check' },
    ];

    checks.forEach(c => {
        const found = finalArticle.includes(c.term);
        const pass = found === c.expected;
        const icon = pass ? '  OK  ' : ' FAIL ';
        console.log('[' + icon + '] "' + c.term + '" — ' + (found ? 'FOUND' : 'NOT FOUND') + ' | Expected: ' + (c.expected ? 'present' : 'absent') + ' | ' + c.note);
    });
}
run().catch(console.error);
