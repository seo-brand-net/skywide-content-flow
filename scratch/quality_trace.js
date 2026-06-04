const fs = require('fs');
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

function extractText(json) {
    if (!json) return '';
    // Try all known content paths
    return json.text
        || json.content
        || json.documentContent
        || json.message?.content
        || json.choices?.[0]?.message?.content
        || json.output?.content
        || '';
}

function wordCount(text) {
    return text.replace(/[#*_`>\-\[\]]/g, '').split(/\s+/).filter(w => w.length > 0).length;
}

function firstLine(text, n = 3) {
    return text.split('\n').filter(l => l.trim()).slice(0, n).join(' | ');
}

async function run() {
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2781?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());
    const rd = res.data?.resultData?.runData || {};

    // The content pipeline in order
    const pipeline = [
        { node: 'Claude Draft (Claude Opus 3)1', label: 'STAGE 1: Claude Draft (initial write)' },
        { node: 'Data Check & Research Gaps1', label: 'STAGE 2: Data Check & Research Gaps (merge + fact review)', path: (j) => j.choices?.[0]?.message?.content || extractText(j) },
        { node: 'Post-Draft Fact Checker', label: 'STAGE 3: Post-Draft Fact Checker', path: (j) => j.choices?.[0]?.message?.content || extractText(j) },
        { node: 'Claude Keyword Check + Semantic Gap1', label: 'STAGE 4: Keyword Check & Semantic Gap', path: (j) => j.text || extractText(j) },
        { node: 'Claude Apply Recommendations1', label: 'STAGE 5: Apply Keyword Recommendations', path: (j) => j.text || extractText(j) },
        { node: 'Claude EEAT Injection1', label: 'STAGE 6: EEAT Injection', path: (j) => j.text || extractText(j) },
        { node: 'Claude NLP & PR Optimization', label: 'STAGE 7: NLP & PR Optimization', path: (j) => j.text || extractText(j) },
        { node: 'Claude Humanised Readability Rewrite', label: 'STAGE 8: Humanised Readability Rewrite', path: (j) => j.text || extractText(j) },
        { node: 'Claude Final SEO Snippet Optimization', label: 'STAGE 9: Final SEO Snippet Optimization', path: (j) => j.text || extractText(j) },
        { node: 'Document Export Sanitization5', label: 'STAGE 10: Document Export Sanitization (pre-QA)', path: (j) => j.message?.content || extractText(j) },
        { node: 'Edit Fields3', label: 'STAGE 11: Edit Fields3 (fed into QA Agent)', path: (j) => j.documentContent || '' },
        { node: 'AI Agent1', label: 'STAGE 12: QA Agent (pass/fail)', path: (j) => j.output?.content || '' },
        { node: 'Document Export Sanitization4', label: 'STAGE 13: Final Export (output)', path: (j) => j.message?.content || j.text || extractText(j) },
    ];

    const out = [];
    out.push('=== ARTICLE CONTENT QUALITY TRACE — EXECUTION #2781 ===\n');
    out.push('Each stage shows: word count, first 3 lines, and any H1/H2 headings found\n');
    out.push('='.repeat(80));

    pipeline.forEach(({ node, label, path }) => {
        const runs = rd[node];
        if (!runs || runs.length === 0) {
            out.push(`\n${label}\n  ⚠️  NOT RUN / NO DATA\n`);
            return;
        }

        runs.forEach((run, i) => {
            const json = run.data?.main?.[0]?.[0]?.json || {};
            const text = path ? path(json) : extractText(json);
            const wc = wordCount(text);
            const h1 = text.match(/^# (.+)$/m)?.[1] || '(no H1 found)';
            const h2s = [...text.matchAll(/^## (.+)$/gm)].map(m => m[1]);
            const intro = firstLine(text);

            const runLabel = runs.length > 1 ? ` [Run ${i+1}/${runs.length}]` : '';
            out.push(`\n${label}${runLabel}`);
            out.push(`  Words: ${wc} | H1: ${h1}`);
            out.push(`  H2s (${h2s.length}): ${h2s.slice(0,3).join(' | ')}${h2s.length > 3 ? '...' : ''}`);
            out.push(`  Opening: ${intro.substring(0, 200)}`);
        });
    });

    const report = out.join('\n');
    fs.writeFileSync('scratch/quality_trace.txt', report);
    console.log(report);
}
run().catch(console.error);
