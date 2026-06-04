/**
 * FINAL COMPREHENSIVE FIX — All issues in one pass
 *
 * FIX 1: If1 — remove spurious `runs >= 1` condition (ALREADY DONE in previous script — verify)
 * FIX 2: Restore Retry Count1 — fix stale .first() (ALREADY DONE — verify)
 * FIX 3: Claude Draft — inject raw Client Site Researcher into CLIENT GROUND TRUTH block
 *         + add rule that brief stats must be verified by Pre-Draft Fact Checker before use
 * FIX 4: Pre-Draft Fact Checker — strengthen to explicitly flag brief stats as "DO NOT USE unless verified"
 * FIX 5: Data Check & Research Gaps1 — inject Post-Draft Fact Checker + H1 lock + word count lock
 * FIX 6: Word count guardrails on Apply Recommendations, EEAT, NLP, Humanised (ALREADY DONE — verify)
 */

const fs = require('fs');
const file = 'DEV Skywide Content (Word Count Fix).json';
let wf = JSON.parse(fs.readFileSync(file, 'utf8'));
let fixes = [];

// ─────────────────────────────────────────────────────────────
// VERIFY FIX 1: If1 runs >= 1 condition removed
// ─────────────────────────────────────────────────────────────
const if1 = wf.nodes.find(n => n.name === 'If1');
const has_runs_cond = if1?.parameters?.conditions?.conditions?.some(c => c.id === '26455263-6fba-407c-96df-f5bd605402f8');
fixes.push(has_runs_cond
    ? 'FIX 1 ❌ If1: `runs >= 1` condition still present — removing now'
    : 'FIX 1 ✅ If1: `runs >= 1` condition already removed');
if (has_runs_cond) {
    if1.parameters.conditions.conditions = if1.parameters.conditions.conditions.filter(
        c => c.id !== '26455263-6fba-407c-96df-f5bd605402f8'
    );
}

// ─────────────────────────────────────────────────────────────
// VERIFY FIX 2: Restore Retry Count1
// ─────────────────────────────────────────────────────────────
const rrc = wf.nodes.find(n => n.name === 'Restore Retry Count1');
const docAssign = rrc?.parameters?.assignments?.assignments?.find(a => a.id === 'qa_retry_count');
const rrc_ok = docAssign?.value === '={{ $json.message.content }}';
fixes.push(rrc_ok
    ? 'FIX 2 ✅ Restore Retry Count1: already reads $json.message.content'
    : 'FIX 2 ❌ Restore Retry Count1: still stale — fixing now');
if (!rrc_ok && docAssign) {
    docAssign.value = '={{ $json.message.content }}';
}

// ─────────────────────────────────────────────────────────────
// FIX 3: Claude Draft — inject raw Client Site Researcher output
//         into the CLIENT GROUND TRUTH block (after VERIFIED PUBLISHED STATS)
//         + add brief hallucination warning rule
// ─────────────────────────────────────────────────────────────
const claudeDraft = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
const cdMsg = claudeDraft?.parameters?.messages?.messageValues?.[0];
if (cdMsg && typeof cdMsg.message === 'string') {
    const msg = cdMsg.message;

    // Check if already patched
    if (msg.includes('Client Site Researcher')) {
        fixes.push('FIX 3a ✅ Claude Draft: Client Site Researcher already injected');
    } else {
        // Inject raw researcher output right after the VERIFIED PUBLISHED STATS block
        const insertMarker = 'PRE-DRAFT FACT CHECK CONSTRAINTS:';
        const idx = msg.indexOf(insertMarker);
        if (idx !== -1) {
            const rawResearchInjection = [
                'RAW CLIENT WEBSITE INTELLIGENCE (HIGHEST AUTHORITY — takes precedence over all other sources):',
                "{{ $('Client Site Researcher').first().json.choices[0].message.content }}",
                '',
                '',
            ].join('\n');
            cdMsg.message = msg.slice(0, idx) + rawResearchInjection + msg.slice(idx);
            fixes.push('FIX 3a ✅ Claude Draft: Raw Client Site Researcher output injected into CLIENT GROUND TRUTH block');
        } else {
            fixes.push('FIX 3a ⚠️ Claude Draft: PRE-DRAFT FACT CHECK marker not found — skipped');
        }
    }

    // Add brief hallucination warning rule — after ANTI-HALLUCINATION PROTOCOL
    const updatedMsg = cdMsg.message;
    if (updatedMsg.includes('brief stats') || updatedMsg.includes('BRIEF STAT WARNING')) {
        fixes.push('FIX 3b ✅ Claude Draft: Brief stat warning already present');
    } else {
        const antiHallEnd = 'RULE 5: Violations of this protocol will cause the article to fail QA and be rejected.';
        const ahIdx = updatedMsg.indexOf(antiHallEnd);
        if (ahIdx !== -1) {
            const briefWarning = [
                '',
                'RULE 6: The creative brief may contain statistics and claims that are INVENTED or UNVERIFIED.',
                '        The Pre-Draft Fact Checker has audited the brief and flagged problematic claims above.',
                '        DO NOT use any statistic or claim from the brief that was flagged as unverified.',
                '        If in doubt, omit the number and use qualitative language (e.g. "many studies suggest").',
                'RULE 7: The CLIENT GROUND TRUTH block above is the SINGLE SOURCE OF TRUTH for all client-specific',
                '        facts. It overrides the brief, overrides your training data, overrides any other research.',
                '        When the brief contradicts the client website, the client website WINS.',
                '',
            ].join('\n');
            cdMsg.message = updatedMsg.slice(0, ahIdx + antiHallEnd.length) + briefWarning + updatedMsg.slice(ahIdx + antiHallEnd.length);
            fixes.push('FIX 3b ✅ Claude Draft: Added RULE 6 (brief stats may be hallucinated) + RULE 7 (client site is highest authority)');
        } else {
            fixes.push('FIX 3b ⚠️ Claude Draft: RULE 5 marker not found — brief warning not injected');
        }
    }
}

// ─────────────────────────────────────────────────────────────
// FIX 4: Pre-Draft Fact Checker — strengthen system prompt
//         to explicitly label each flagged stat as REMOVE vs KEEP
// ─────────────────────────────────────────────────────────────
const pdfc = wf.nodes.find(n => n.name === 'Pre-Draft Fact Checker');
if (pdfc?.parameters?.messages?.message) {
    const sysMsg = pdfc.parameters.messages.message[0];
    if (sysMsg && typeof sysMsg.content === 'string') {
        if (sysMsg.content.includes('BRIEF STAT WARNING') || sysMsg.content.includes('REMOVE FROM BRIEF')) {
            fixes.push('FIX 4 ✅ Pre-Draft Fact Checker: Brief stat removal instruction already present');
        } else {
            const appendInstruction = [
                '',
                '⚠️ CRITICAL ADDITIONAL DIRECTIVE — BRIEF STAT HANDLING:',
                'The creative brief provided to you was written by a human and MAY CONTAIN INVENTED or HALLUCINATED statistics.',
                'Your job is to be the final gate before these stats enter the article.',
                '',
                'For EVERY statistic, percentage, or quantified claim in the brief:',
                '- Search for it against primary sources (government, peer-reviewed, official org websites)',
                '- If VERIFIED: label it ✅ VERIFIED — safe to use',
                '- If NOT FOUND or only found on low-authority/client-created pages: label it ❌ REMOVE FROM BRIEF — do not use in article',
                '- If DIRECTIONALLY TRUE but imprecise: label it ⚠️ REWRITE — use qualitative language instead',
                '',
                'Output a clear BRIEF STAT AUDIT section at the end of your fact-check report listing each stat and its verdict.',
                'The writer will use this list to know exactly which brief claims they are forbidden from including.',
            ].join('\n');
            sysMsg.content += appendInstruction;
            fixes.push('FIX 4 ✅ Pre-Draft Fact Checker: Added BRIEF STAT AUDIT directive — will now explicitly label each brief stat as VERIFIED / REMOVE / REWRITE');
        }
    }
}

// ─────────────────────────────────────────────────────────────
// FIX 5: Data Check & Research Gaps1
//         Wire in Post-Draft Fact Checker + H1 lock + word count lock
// ─────────────────────────────────────────────────────────────
const dcNode = wf.nodes.find(n => n.name === 'Data Check & Research Gaps1');
if (dcNode?.parameters?.messages?.message) {
    const userMsg = dcNode.parameters.messages.message[1]; // user message is index 1
    if (userMsg && typeof userMsg.content === 'string') {

        // Check which parts are already done
        const hasPostDraft = userMsg.content.includes('Post-Draft Fact Checker');
        const hasH1Lock = userMsg.content.includes('H1 PRESERVATION RULE');
        const hasWordLock = userMsg.content.includes('WORD COUNT LOCK');
        const hasClientPriority = userMsg.content.includes('CLIENT WEBSITE IS HIGHEST AUTHORITY');

        if (hasPostDraft) fixes.push('FIX 5a ✅ Data Check: Post-Draft Fact Checker ref already present');
        if (hasH1Lock) fixes.push('FIX 5b ✅ Data Check: H1 lock already present');
        if (hasWordLock) fixes.push('FIX 5c ✅ Data Check: Word count lock already present');
        if (hasClientPriority) fixes.push('FIX 5d ✅ Data Check: Client website priority already present');

        // Build what needs to be injected
        const injections = [];

        if (!hasH1Lock) {
            injections.push('⚠️ H1 PRESERVATION RULE: Do NOT change the article H1/title. Preserve it exactly as written in the draft.');
        }
        if (!hasWordLock) {
            injections.push("⚠️ WORD COUNT LOCK: Target is {{ $('Webhook1').first().json.body.word_count }} words (±10% = {{ $('Webhook1').first().json.body.word_count * 0.9 }}–{{ $('Webhook1').first().json.body.word_count * 1.1 }} words). If you add content, cut equal length elsewhere. Count before submitting.");
        }
        if (!hasClientPriority) {
            injections.push("⚠️ CLIENT WEBSITE IS HIGHEST AUTHORITY: The client's website data overrides the brief and any other research source. If a brief claim contradicts what the client website says, follow the client website.");
        }
        if (!hasPostDraft) {
            injections.push("# Post-Draft Fact Check (apply ALL corrections — remove any claims marked ❌ REMOVE):\n{{ $('Post-Draft Fact Checker').first().json.choices[0].message.content }}");
        }

        if (injections.length > 0) {
            // Find the draft section to inject before it
            const draftMarker = '# Draft:';
            const idx = userMsg.content.indexOf(draftMarker);
            const block = '\n\n' + injections.join('\n\n') + '\n\n';

            if (idx !== -1) {
                userMsg.content = userMsg.content.slice(0, idx) + block + userMsg.content.slice(idx);
                fixes.push('FIX 5 ✅ Data Check & Research Gaps1: Injected missing rules before draft section');
            } else {
                // Prepend to content
                userMsg.content = block + userMsg.content;
                fixes.push('FIX 5 ✅ Data Check & Research Gaps1: Prepended missing rules (draft marker not found)');
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// VERIFY FIX 6: Word count guardrails on downstream nodes
// ─────────────────────────────────────────────────────────────
const guardrailNodes = [
    'Claude Apply Recommendations1',
    'Claude EEAT Injection1',
    'Claude NLP & PR Optimization',
    'Claude Humanised Readability Rewrite',
];
guardrailNodes.forEach(name => {
    const node = wf.nodes.find(n => n.name === name);
    const msgArr = node?.parameters?.messages?.messageValues;
    const lastMsg = msgArr?.[msgArr.length - 1]?.message || '';
    if (lastMsg.includes('FINAL WORD COUNT CHECK')) {
        fixes.push(`FIX 6 ✅ ${name}: Word count guardrail present`);
    } else {
        fixes.push(`FIX 6 ❌ ${name}: Missing word count guardrail — adding`);
        const guardrail = "\n\n⚠️ FINAL WORD COUNT CHECK — MANDATORY BEFORE SUBMITTING:\n1. Count every word in your output.\n2. Target: {{ $('Webhook1').first().json.body.word_count }} words (±10% = {{ $('Webhook1').first().json.body.word_count * 0.9 }}–{{ $('Webhook1').first().json.body.word_count * 1.1 }}).\n3. If OVER: remove least impactful sentences until within range.\n4. If UNDER: expand a thin section.\n5. Do NOT include this check in your output — output only the article.\n";
        if (msgArr?.[msgArr.length - 1]) {
            msgArr[msgArr.length - 1].message += guardrail;
        }
    }
});

// ─────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────
fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('\n' + '='.repeat(50));
console.log('ALL FIXES APPLIED:');
console.log('='.repeat(50));
fixes.forEach(f => console.log(f));
console.log('\n✅ Saved. Ready to push to n8n.');
