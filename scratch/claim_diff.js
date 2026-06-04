const fs = require('fs');
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

function extractText(json) {
    return json?.text || json?.content || json?.message?.content
        || json?.choices?.[0]?.message?.content || '';
}

// Patterns that are hallucination signals
const hallucPatterns = [
    /\d+%/g,                          // any percentage
    /\d+\s*(x|times)\s+/gi,          // multipliers like "3x better"
    /studies show/gi,
    /research (shows|reveals|suggests|indicates|demonstrates)/gi,
    /clinical (data|evidence|experience|outcomes)/gi,
    /\d+\s+(hours?|years?|months?|children|patients|families)/gi,
    /over \d+/gi,
    /more than \d+/gi,
    /spanning \d+/gi,
    /documented (across|by|in)/gi,
    /professionals.{0,30}(report|say|note|confirm|observe)/gi,
];

function findClaims(text) {
    const found = new Set();
    hallucPatterns.forEach(pat => {
        const matches = text.match(pat) || [];
        matches.forEach(m => found.add(m.trim()));
    });
    // Also find sentences containing numbers
    const sentences = text.split(/[.!?]/);
    sentences.forEach(s => {
        if (/\d/.test(s) && s.trim().length > 20) {
            found.add(s.trim().substring(0, 120));
        }
    });
    return [...found];
}

async function run() {
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2781?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());
    const rd = res.data?.resultData?.runData || {};

    // Compare run 3 (the final pipeline cycle) at each stage
    function getRun(nodeName, runIndex) {
        const runs = rd[nodeName];
        if (!runs || !runs[runIndex]) return '';
        return extractText(runs[runIndex].data?.main?.[0]?.[0]?.json || {});
    }

    // For each pair of adjacent stages, find claims that APPEAR in the output but not the input
    const stages = [
        { name: 'Claude Draft (Claude Opus 3)1',       run: 1, label: 'STAGE 1: Claude Draft' },
        { name: 'Data Check & Research Gaps1',          run: 2, label: 'STAGE 2: Data Check' },
        { name: 'Post-Draft Fact Checker',              run: 2, label: 'STAGE 3: Post-Draft Fact Checker' },
        { name: 'Claude Apply Recommendations1',        run: 2, label: 'STAGE 5: Apply Recommendations' },
        { name: 'Claude EEAT Injection1',               run: 2, label: 'STAGE 6: EEAT Injection' },
        { name: 'Claude NLP & PR Optimization',         run: 2, label: 'STAGE 7: NLP & PR Optimization' },
        { name: 'Claude Humanised Readability Rewrite', run: 2, label: 'STAGE 8: Humanised Rewrite' },
        { name: 'Claude Final SEO Snippet Optimization',run: 2, label: 'STAGE 9: Final SEO Snippet' },
    ];

    const stageTexts = stages.map(s => ({
        label: s.label,
        text: getRun(s.name, s.run)
    }));

    console.log('=== CLAIM DIFF — WHAT EACH STAGE ADDS ===\n');

    for (let i = 1; i < stageTexts.length; i++) {
        const prev = stageTexts[i - 1];
        const curr = stageTexts[i];
        if (!curr.text) { console.log(`\n${curr.label}: NO DATA\n`); continue; }

        // Find sentences with numbers/claims in current that don't appear in previous
        const currSentences = curr.text.split(/(?<=[.!?])\s+/);
        const newClaims = currSentences.filter(s => {
            // Only sentences with numbers, stats, or authority phrases
            const hasSignal = /\d|studies show|research|clinical|documented|spanning|professionals|treatment centers/i.test(s);
            if (!hasSignal) return false;
            // Check if it's genuinely new (not in previous stage)
            const snippet = s.substring(0, 60);
            return !prev.text.includes(snippet);
        });

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`${curr.label}`);
        console.log(`New numerical/authority claims introduced (${newClaims.length}):`);
        if (newClaims.length === 0) {
            console.log('  (none — stage preserved existing claims only)');
        } else {
            newClaims.slice(0, 15).forEach(c => console.log(`  → ${c.substring(0, 150).trim()}`));
        }
    }

    // Now specifically check: what does EEAT add vs its input
    console.log('\n\n=== EEAT NODE DETAILED ANALYSIS ===');
    const applyOut = getRun('Claude Apply Recommendations1', 2);
    const eeatOut  = getRun('Claude EEAT Injection1', 2);
    if (applyOut && eeatOut) {
        const eeatSentences = eeatOut.split(/(?<=[.!?])\s+/);
        const addedByEEAT = eeatSentences.filter(s => {
            if (s.trim().length < 30) return false;
            return !applyOut.includes(s.substring(0, 50));
        });
        console.log(`\nEEAT added ${addedByEEAT.length} new sentence(s) vs Apply Recommendations output:`);
        addedByEEAT.forEach(s => console.log(`  + ${s.substring(0, 200).trim()}`));

        // Also check what EEAT removed
        const applySentences = applyOut.split(/(?<=[.!?])\s+/);
        const removedByEEAT = applySentences.filter(s => {
            if (s.trim().length < 30) return false;
            return !eeatOut.includes(s.substring(0, 50));
        });
        console.log(`\nEEAT removed/changed ${removedByEEAT.length} sentence(s):`);
        removedByEEAT.slice(0, 10).forEach(s => console.log(`  - ${s.substring(0, 200).trim()}`));
    }

    // Check EEAT node prompt to understand what it's instructed to do
    const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
    const eeatNode = wf.nodes.find(n => n.name === 'Claude EEAT Injection1');
    const eeatMsg = eeatNode?.parameters?.messages?.messageValues?.find(m => m.message?.includes('EEAT'));
    console.log('\n=== EEAT PROMPT — KEY INSTRUCTIONS ===');
    if (eeatMsg) {
        const msg = eeatMsg.message || '';
        // Find the core instruction section
        const coreStart = msg.indexOf('Your task is');
        const coreEnd = msg.indexOf('CRITICAL', coreStart + 10);
        if (coreStart !== -1) console.log(msg.substring(coreStart, Math.min(coreStart + 1500, msg.length)));
    }
}
run().catch(console.error);
