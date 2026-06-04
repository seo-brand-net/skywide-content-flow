/**
 * COMPREHENSIVE WORKFLOW FIX SCRIPT
 * Fixes applied:
 * 1. If1 — Remove broken `$json.runs >= 1` condition that always exits loop early
 * 2. Restore Retry Count1 — Fix stale .first() ref so it reads current QA rewrite
 * 3. Data Check & Research Gaps1 — Wire in Post-Draft Fact Checker + H1 preservation + word count lock
 * 4. Claude Draft (Claude Opus 3)1 — Wire in Client Site Researcher output
 * 5. Claude Apply Recommendations1 — Add word count lock guardrail (prompt already has it, verify)
 * 6. Claude EEAT Injection1 — Add word count lock guardrail (prompt already has it, verify)
 */

const fs = require('fs');
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';
const WORKFLOW_ID = 't3LNiuZIghvobde3';

const file = 'DEV Skywide Content (Word Count Fix).json';
let wf = JSON.parse(fs.readFileSync(file, 'utf8'));
let fixes = [];

// ============================================================
// FIX 1: Remove `$json.runs >= 1` condition from If1
// (If2 and If3 don't have it — already clean)
// ============================================================
const if1 = wf.nodes.find(n => n.name === 'If1');
if (if1 && if1.parameters?.conditions?.conditions) {
    const before = if1.parameters.conditions.conditions.length;
    if1.parameters.conditions.conditions = if1.parameters.conditions.conditions.filter(
        c => c.id !== '26455263-6fba-407c-96df-f5bd605402f8'
    );
    const after = if1.parameters.conditions.conditions.length;
    if (before !== after) {
        fixes.push('FIX 1 ✅ If1: Removed spurious `runs >= 1` condition that caused loop to always exit True');
    }
}

// ============================================================
// FIX 2: Restore Retry Count1 — fix stale .first() reference
// QA Rewriter outputs: { index, message: { role, content }, ... }
// We need $json.message.content not $('QA Rewriter Agent1').first().json.message.content
// ============================================================
const rrc = wf.nodes.find(n => n.name === 'Restore Retry Count1');
if (rrc && rrc.parameters?.assignments?.assignments) {
    const docAssign = rrc.parameters.assignments.assignments.find(a => a.id === 'qa_retry_count');
    if (docAssign) {
        docAssign.value = "={{ $json.message.content }}";
        fixes.push("FIX 2 ✅ Restore Retry Count1: documentContent now reads $json.message.content (current item) instead of stale .first()");
    }
}

// ============================================================
// FIX 3: Data Check & Research Gaps1
// a) Inject Post-Draft Fact Checker output into the user message
// b) Add H1 preservation instruction
// c) Add word count lock
// ============================================================
const dcNode = wf.nodes.find(n => n.name === 'Data Check & Research Gaps1');
if (dcNode && dcNode.parameters?.messages?.message) {
    const userMsg = dcNode.parameters.messages.message.find(m => !m.role || m.role === 'user');
    if (userMsg && typeof userMsg.content === 'string') {
        // Find where the draft content begins to inject above it
        const draftMarker = '# Draft:\\n';
        const idx = userMsg.content.indexOf(draftMarker);

        if (idx !== -1) {
            const factCheckerInjection = `\n# Verified Fact-Check Report (MUST apply — correct any claims that contradict this):\n{{ $('Post-Draft Fact Checker').first().json.choices[0].message.content }}\n\n`;
            const h1Lock = `\n⚠️ H1 PRESERVATION RULE: Do NOT rewrite or rename the article's H1/title. Keep it exactly as it appears in the draft.\n\n`;
            const wordCountLock = `\n⚠️ WORD COUNT LOCK: Target is {{ $('Webhook1').first().json.body.word_count }} words (±10%). Current draft is approximately that length. If you add content, you MUST remove equal length elsewhere. Do NOT let the article grow.\n\n`;

            userMsg.content = userMsg.content.slice(0, idx)
                + h1Lock
                + wordCountLock
                + factCheckerInjection
                + userMsg.content.slice(idx);

            fixes.push('FIX 3a ✅ Data Check & Research Gaps1: Injected Post-Draft Fact Checker verified output before draft section');
            fixes.push('FIX 3b ✅ Data Check & Research Gaps1: Added H1 preservation rule');
            fixes.push('FIX 3c ✅ Data Check & Research Gaps1: Added word count lock');
        } else {
            fixes.push('FIX 3 ⚠️ Data Check: Could not find draft marker — injected at end of user message instead');
            const factCheckerInjection = `\n\n# Verified Fact-Check Report (MUST apply — correct any claims that contradict this):\n{{ $('Post-Draft Fact Checker').first().json.choices[0].message.content }}\n\n⚠️ H1 PRESERVATION RULE: Do NOT rewrite or rename the article H1/title. Keep it exactly as in the draft.\n⚠️ WORD COUNT LOCK: Target is {{ $('Webhook1').first().json.body.word_count }} words (±10%). Do NOT let the article grow.\n`;
            userMsg.content += factCheckerInjection;
        }
    }
}

// ============================================================
// FIX 4: Claude Draft (Claude Opus 3)1 — inject Client Site Researcher
// Add it into the user message before the brief/assignment section
// ============================================================
const claudeDraft = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
if (claudeDraft && claudeDraft.parameters?.messages?.messageValues) {
    const userMsg = claudeDraft.parameters.messages.messageValues.find(m => !m.role || m.role === 'user' || !m.message?.includes('system'));
    // It uses messageValues array with a single combined message
    const msg = claudeDraft.parameters.messages.messageValues[claudeDraft.parameters.messages.messageValues.length - 1];
    if (msg && typeof msg.message === 'string') {
        // Inject client site research before the content assignment section
        const assignmentMarker = '# Your Content Assignment';
        const idx = msg.message.indexOf(assignmentMarker);
        if (idx !== -1) {
            const clientResearchInjection = `\n# Verified Client Intelligence (USE THIS — do not invent client-specific details)\nThe following was scraped and verified from the client's own website. Use these exact details when writing about the client:\n{{ $('Client Site Researcher').first().json.choices[0].message.content }}\n\nClient Profile Summary:\n{{ $('Client Profile Extractor').first().json.message.content }}\n\n`;
            msg.message = msg.message.slice(0, idx) + clientResearchInjection + msg.message.slice(idx);
            fixes.push('FIX 4 ✅ Claude Draft: Injected Client Site Researcher + Client Profile Extractor output before content assignment');
        } else {
            fixes.push('FIX 4 ⚠️ Claude Draft: Could not find assignment marker — skipped');
        }
    }
}

// ============================================================
// FIX 5 & 6: Verify word count guardrails in Apply Recommendations and EEAT Injection
// The audit showed they already have word count instructions — but they say "maintain"
// We need to strengthen them to say "never exceed, and count before submitting"
// ============================================================
const nodesToStrengthen = [
    { name: 'Claude Apply Recommendations1', label: 'Apply Recommendations' },
    { name: 'Claude EEAT Injection1', label: 'EEAT Injection' },
    { name: 'Claude NLP & PR Optimization', label: 'NLP & PR Optimization' },
    { name: 'Claude Humanised Readability Rewrite', label: 'Humanised Readability Rewrite' },
];

nodesToStrengthen.forEach(({ name, label }) => {
    const node = wf.nodes.find(n => n.name === name);
    if (!node) return;

    const msgArr = node.parameters?.messages?.messageValues;
    if (!msgArr) return;

    const msg = msgArr[msgArr.length - 1];
    if (!msg || typeof msg.message !== 'string') return;

    const guardrail = `\n\n⚠️ FINAL WORD COUNT CHECK — MANDATORY BEFORE SUBMITTING:\n1. Count every word in your output.\n2. Target: {{ $('Webhook1').first().json.body.word_count }} words (±10% = {{ $('Webhook1').first().json.body.word_count * 0.9 }}–{{ $('Webhook1').first().json.body.word_count * 1.1 }} words).\n3. If you are OVER the limit: remove the least impactful sentences until you are within range.\n4. If you are UNDER: expand a thin section. Do NOT submit outside this range.\n5. DO NOT add this word count check to your output — output only the article.\n`;

    // Only add if not already there
    if (!msg.message.includes('FINAL WORD COUNT CHECK')) {
        msg.message += guardrail;
        fixes.push(`FIX 5/6 ✅ ${label}: Added mandatory pre-submit word count check guardrail`);
    } else {
        fixes.push(`FIX 5/6 ℹ️ ${label}: Word count guardrail already present`);
    }
});

// ============================================================
// SAVE
// ============================================================
fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('\n========================================');
console.log('FIXES APPLIED:');
console.log('========================================');
fixes.forEach(f => console.log(f));
console.log('\nWorkflow saved locally. Ready to push.');
