/**
 * audit_pipeline.js
 * Reads the full execution JSON and produces a complete pipeline audit report.
 * Usage: node audit_pipeline.js execution_2764_full.json
 */

const fs   = require('fs');
const file = process.argv[2] || 'execution_2764_full.json';
const raw  = JSON.parse(fs.readFileSync(file, 'utf8'));
const runData = raw.data?.resultData?.runData || {};

// ─── helpers ──────────────────────────────────────────────────────────────────
function getOutput(nodeName) {
    const nr = runData[nodeName];
    if (!nr || !nr[0]) return null;
    const run = nr[0];
    return run?.data?.main?.[0]?.[0]?.json ?? run?.data?.main?.[0]?.[0] ?? null;
}

function getText(nodeName) {
    const o = getOutput(nodeName);
    if (!o) return null;
    if (typeof o === 'string') return o;
    if (o.message?.content) return o.message.content;
    if (o.choices?.[0]?.message?.content) return o.choices[0].message.content;
    if (o.text) return o.text;
    return JSON.stringify(o);
}

function ran(nodeName) { return !!runData[nodeName]; }

function truncate(s, n = 600) {
    if (!s) return '(empty)';
    s = String(s).trim();
    return s.length > n ? s.slice(0, n) + `\n  … [${s.length} chars total]` : s;
}

const FLAGS = [];
function flag(severity, node, issue, detail = '') {
    FLAGS.push({ severity, node, issue, detail });
}

function section(title) {
    console.log('\n' + '═'.repeat(72));
    console.log('  ' + title);
    console.log('═'.repeat(72));
}

function sub(title) {
    console.log('\n  ── ' + title);
}

// ─── 1. EXECUTION META ────────────────────────────────────────────────────────
section('1. EXECUTION OVERVIEW');
const dur = raw.stoppedAt
    ? Math.round((new Date(raw.stoppedAt) - new Date(raw.startedAt)) / 1000) + 's'
    : 'still running';
console.log(`  ID       : ${raw.id}`);
console.log(`  Status   : ${raw.status}`);
console.log(`  Started  : ${raw.startedAt}`);
console.log(`  Duration : ${dur}`);
console.log(`  Nodes    : ${Object.keys(runData).length} ran`);

// ─── 2. NODE EXECUTION MAP ────────────────────────────────────────────────────
section('2. FULL NODE EXECUTION MAP (in order)');
Object.keys(runData).forEach((name, i) => {
    const out = getOutput(name);
    const hasOutput = !!out && JSON.stringify(out) !== '{}';
    const icon = hasOutput ? '✅' : '⚠️ ';
    const preview = truncate(getText(name) || JSON.stringify(out), 90).replace(/\n/g, ' ');
    console.log(`  ${String(i+1).padStart(2)}. ${icon} [${name}]`);
    console.log(`      ${preview}`);
});

// ─── 3. GROUND TRUTH — WHAT CLIENT RESEARCHER FOUND ─────────────────────────
section('3. GROUND TRUTH — Client Site Researcher Output');
const clientResearchText = getText('Client Site Researcher');
if (!clientResearchText) {
    flag('CRITICAL', 'Client Site Researcher', 'Node produced no output');
    console.log('  ❌ NO OUTPUT');
} else {
    console.log(truncate(clientResearchText, 1200));
}

section('3b. Client Profile Extractor — Structured JSON');
const profileOutput = getOutput('Client Profile Extractor');
if (!profileOutput) {
    flag('CRITICAL', 'Client Profile Extractor', 'No structured profile produced');
    console.log('  ❌ NO OUTPUT');
} else {
    console.log(JSON.stringify(profileOutput, null, 4));
    const stats = profileOutput.published_stats || [];
    if (stats.length === 0) {
        flag('HIGH', 'Client Profile Extractor', 'published_stats is empty — no client-owned figures extracted', 
            'Writer nodes will have no verified stats to anchor to, guaranteeing hallucination');
    } else {
        console.log(`\n  ✅ Published stats found (${stats.length}):`);
        stats.forEach(s => console.log('    •', s));
    }
}

// ─── 4. PRE-DRAFT FACT CHECKER ────────────────────────────────────────────────
section('4. Pre-Draft Fact Checker Output');
const preFactText = getText('Pre-Draft Fact Checker');
if (!preFactText) {
    flag('CRITICAL', 'Pre-Draft Fact Checker', 'Node produced no output');
    console.log('  ❌ NO OUTPUT');
} else {
    console.log(truncate(preFactText, 1500));
}

// ─── 5. KEYWORD STRATEGIST — does it carry client data forward? ───────────────
section('5. Keyword Strategist — does it carry client profile & fact-check forward?');
const stratText = getText('Keyword Strategist');
const stratOut  = getOutput('Keyword Strategist');
const profileStr = JSON.stringify(profileOutput || {});

const carriesProfile  = stratText && (stratText.includes('Helping Hands') || stratText.includes('published_stats') || stratText.includes('100% accreditation'));
const carriesFactCheck = stratText && (preFactText ? stratText.includes(preFactText.substring(0, 50)) : false);

console.log(`  Client profile injected into Strategist output : ${carriesProfile  ? '✅ YES' : '❌ NO'}`);
console.log(`  Fact-check findings injected into Strategist   : ${carriesFactCheck ? '✅ YES' : '❌ NO'}`);

if (!carriesProfile) {
    flag('CRITICAL', 'Keyword Strategist', 
        'Client profile data is NOT carried forward into the brief sent to writers',
        'Writers receive zero client ground truth — hallucination is inevitable');
}
if (!carriesFactCheck) {
    flag('HIGH', 'Keyword Strategist',
        'Pre-Draft Fact Checker findings are NOT passed into the brief',
        'Fact-check was wasted — writers never see its constraints');
}

if (stratOut) {
    console.log('\n  Strategist output keys:', Object.keys(stratOut).join(', '));
    console.log('\n  Preview:', truncate(stratText, 500));
}

// ─── 6. WRITER NODES — what they received ────────────────────────────────────
section('6. Writer Nodes — Input Analysis');

const writerNodes = [
    'OpenAI Draft (GPT-4O)1',
    'Claude Draft (Claude Opus 3)1',
];

const groundTruthTokens = [
    '100% accreditation',
    'Play-Based',
    'Helping Hands Family',
    'BHCOE',
    'RBT',
    '60%',
    '70%',
    '30%',
];

const hallucinationPatterns = [
    { pattern: /(\d+)%/g,                           label: 'Percentage stat' },
    { pattern: /studies? (show|reveal|demonstrate)/gi, label: 'Vague "studies show"' },
    { pattern: /research (shows?|reveals?|demonstrates?)/gi, label: 'Vague "research shows"' },
    { pattern: /according to/gi,                    label: '"According to" (uncited)' },
    { pattern: /\d+ times (more|better|faster|higher)/gi, label: 'Multiplier claim' },
    { pattern: /university research/gi,             label: 'Vague university citation' },
    { pattern: /clinical (data|experience|outcomes) (from|across)/gi, label: 'Vague clinical data' },
    { pattern: /treatment providers? (specializ|report|consistently)/gi, label: 'Vague provider attribution' },
    { pattern: /professional standards (from|recommend)/gi, label: 'Vague professional standards' },
    { pattern: /longitudinal (research|studies|data)/gi, label: 'Vague longitudinal study' },
];

writerNodes.forEach(nodeName => {
    sub(`Writer: ${nodeName}`);
    const draftText = getText(nodeName);

    if (!draftText) {
        flag('CRITICAL', nodeName, 'Writer produced no output — node did not run or failed silently');
        console.log('  ❌ NO OUTPUT / DID NOT RUN');
        return;
    }

    // Ground truth check
    console.log('\n  Ground truth tokens from client profile:');
    groundTruthTokens.forEach(token => {
        const found = draftText.includes(token);
        console.log(`    ${found ? '✅' : '❌'} "${token}" → ${found ? 'present' : 'MISSING'}`);
        if (!found && token !== 'RBT') { // RBT is acceptable to miss
            flag('MEDIUM', nodeName, `Client ground truth token missing from draft: "${token}"`);
        }
    });

    // Hallucination sniff
    const hallucinationHits = [];
    hallucinationPatterns.forEach(({ pattern, label }) => {
        const matches = [...draftText.matchAll(pattern)];
        if (matches.length > 0) {
            matches.forEach(m => {
                const start = Math.max(0, m.index - 40);
                const context = draftText.substring(start, m.index + 80).replace(/\n/g, ' ');
                hallucinationHits.push({ label, match: m[0], context });
            });
        }
    });

    console.log(`\n  Suspicious/unverified claim patterns (${hallucinationHits.length} hits):`);
    hallucinationHits.slice(0, 15).forEach(h => {
        console.log(`    ⚠️  [${h.label}] "${h.match}" → ...${h.context}...`);
    });
    if (hallucinationHits.length > 15) console.log(`    … and ${hallucinationHits.length - 15} more`);

    if (hallucinationHits.length > 5) {
        flag('HIGH', nodeName, 
            `${hallucinationHits.length} suspicious precision stats / vague citations detected in draft`,
            'Writer is fabricating authority signals without verified sources');
    }
});

// ─── 7. DATA MERGE NODE ───────────────────────────────────────────────────────
section('7. Data Check & Research Gaps (Merge Node)');
const mergeText = getText('Data Check & Research Gaps1');
if (!mergeText) {
    flag('CRITICAL', 'Data Check & Research Gaps1', 'Merge node produced no output');
    console.log('  ❌ NO OUTPUT');
} else {
    const missingDrafts = mergeText.includes("missing") || mergeText.includes("Draft 1") || mergeText.includes("Draft 2");
    if (missingDrafts) {
        flag('CRITICAL', 'Data Check & Research Gaps1',
            'Merge node explicitly states it did not receive Draft 1 and/or Draft 2',
            'The merge is running blind — it generates content from scratch instead of synthesizing two real drafts');
    }
    console.log(truncate(mergeText, 800));
}

// ─── 8. POST-DRAFT FACT CHECKER ───────────────────────────────────────────────
section('8. Post-Draft Fact Checker Output');
const postFactText = getText('Post-Draft Fact Checker');
if (!postFactText) {
    flag('CRITICAL', 'Post-Draft Fact Checker', 'Node produced no output');
    console.log('  ❌ NO OUTPUT');
} else {
    // Does it reference client profile at all?
    const refersToClient = postFactText.includes('Helping Hands') || postFactText.includes('BHCOE') || postFactText.includes('published_stats');
    const approvesClaims = postFactText.toLowerCase().includes('verified') || postFactText.toLowerCase().includes('accurate') || postFactText.toLowerCase().includes('confirmed');
    
    console.log(`  References client ground truth profile : ${refersToClient ? '✅ YES' : '❌ NO'}`);
    console.log(`  Appears to approve/validate content   : ${approvesClaims ? '⚠️  YES (check if approving hallucinations)' : '— Not conclusive'}`);
    
    if (!refersToClient) {
        flag('HIGH', 'Post-Draft Fact Checker',
            'Does not reference the client profile when fact-checking',
            'It validates the draft against the brief only — cannot catch hallucinated third-party stats');
    }
    console.log('\n', truncate(postFactText, 1000));
}

// ─── 9. QA / SCORING NODES ───────────────────────────────────────────────────
section('9. QA & Scoring Nodes');

const qaNodes = [
    '1st Scoring Agent2',
    '1st Scoring Agent3',
    'AI Agent1',
    'Flag For Human Review',
    'Structure Auditor (Pass 1)',
    'Structure Auditor (Pass 2)',
];

qaNodes.forEach(name => {
    const out = getOutput(name);
    const text = getText(name);
    if (!out) { console.log(`  ⏭️  [${name}]: did not run`); return; }

    // Flag For Human Review
    if (name === 'Flag For Human Review') {
        const flagged = out.rewrite_flagged;
        const reason  = out.rewrite_flag_reason;
        console.log(`\n  [Flag For Human Review]`);
        console.log(`    Flagged: ${flagged ? '🔴 YES' : '✅ NO'}`);
        if (flagged) {
            console.log(`    Reason : ${reason}`);
            flag('HIGH', 'Flag For Human Review', reason || 'Flagged for human review without a reason');
        }
        return;
    }

    // AI Agent validation
    if (name === 'AI Agent1') {
        const agentOut = out.output || out;
        const passed = agentOut.passed === 'true' || agentOut.passed === true;
        const issues = agentOut.validation_issues;
        console.log(`\n  [AI Agent1 — QA Validator]`);
        console.log(`    Passed: ${passed ? '✅ YES' : '❌ NO'}`);
        if (issues) {
            console.log(`    Issues: ${truncate(String(issues), 400)}`);
            if (!passed) flag('MEDIUM', 'AI Agent1', 'QA validation failed', String(issues).substring(0, 200));
        }
        return;
    }

    // Scoring agents
    if (name.includes('Scoring Agent')) {
        const scores = typeof out === 'object' ? out : {};
        console.log(`\n  [${name}]`);
        Object.entries(scores).forEach(([k, v]) => {
            if (typeof v === 'number') {
                const icon = v >= 80 ? '✅' : v >= 65 ? '⚠️ ' : '❌';
                console.log(`    ${icon} ${k}: ${v}`);
                if (v < 70) flag('MEDIUM', name, `Low score on "${k}": ${v}/100`);
            }
        });
        return;
    }

    // Structure auditors
    if (name.includes('Structure Auditor')) {
        const violations = out.rules_violated || [];
        console.log(`\n  [${name}]`);
        console.log(`    Headings match : ${out.headings_match ? '✅' : '❌'}`);
        console.log(`    FAQ included   : ${out.faq_included  ? '✅' : '❌'}`);
        console.log(`    Violations     : ${violations.length === 0 ? '✅ None' : violations.join(', ')}`);
        violations.forEach(v => flag('MEDIUM', name, `Structure violation: ${v}`));
        return;
    }

    console.log(`\n  [${name}]: ${truncate(text, 200)}`);
});

// ─── 10. FINAL OUTPUT ─────────────────────────────────────────────────────────
section('10. Final Article Output');
const finalNodes = ['Surgical Rewriter', 'Document Export Sanitization5', 'Document Export Sanitization4'];
let finalText = null;
let finalNode = null;
for (const n of finalNodes) {
    const t = getText(n);
    if (t && t.length > 100) { finalText = t; finalNode = n; break; }
}

if (!finalText) {
    flag('CRITICAL', 'Final Output', 'No final article text found in export nodes');
    console.log('  ❌ NO FINAL ARTICLE FOUND');
} else {
    console.log(`  Source node : ${finalNode}`);
    console.log(`  Length      : ${finalText.length} chars (~${Math.round(finalText.split(/\s+/).length)} words)`);
    
    // Check for HHF stats in final
    const hhfStats = ['60%', '70%', '30%', 'BHCOE', '100% accreditation', 'play-based', 'Play-Based'];
    console.log('\n  HHFamily verified claims in final article:');
    hhfStats.forEach(s => {
        const found = finalText.toLowerCase().includes(s.toLowerCase());
        console.log(`    ${found ? '✅' : '❌'} "${s}"`);
        if (!found) flag('MEDIUM', 'Final Article', `Verified client claim missing from final: "${s}"`);
    });

    // Count hallucination patterns in final
    let finalHallucinations = 0;
    hallucinationPatterns.forEach(({ pattern }) => {
        const hits = [...finalText.matchAll(pattern)];
        finalHallucinations += hits.length;
        pattern.lastIndex = 0;
    });
    console.log(`\n  Suspicious stat patterns in final article: ${finalHallucinations}`);
    if (finalHallucinations > 8) {
        flag('HIGH', 'Final Article', 
            `${finalHallucinations} suspicious precision stats / vague citations detected in final output`,
            'Anti-hallucination protocol is not working at the final stage');
    }

    // GDrive document link
    const gdoc = getOutput('Create a document17') || getOutput('Create a document');
    if (gdoc?.id) {
        console.log(`\n  📄 Google Doc: https://docs.google.com/document/d/${gdoc.id}/edit`);
    }
    
    console.log('\n  Article preview (first 600 chars):');
    console.log('  ' + finalText.substring(0, 600).replace(/\n/g, '\n  '));
}

// ─── 11. FLAGS SUMMARY ────────────────────────────────────────────────────────
section('11. ⚠️  FLAGS — ALL ISSUES FOUND (needs your approval to fix)');

const bySeverity = { CRITICAL: [], HIGH: [], MEDIUM: [] };
FLAGS.forEach(f => { if (bySeverity[f.severity]) bySeverity[f.severity].push(f); });

const icons = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡' };
let totalFlags = 0;

['CRITICAL', 'HIGH', 'MEDIUM'].forEach(sev => {
    const list = bySeverity[sev];
    if (!list.length) return;
    console.log(`\n  ${icons[sev]} ${sev} (${list.length})`);
    list.forEach((f, i) => {
        totalFlags++;
        console.log(`\n    ${i+1}. Node    : ${f.node}`);
        console.log(`       Issue   : ${f.issue}`);
        if (f.detail) console.log(`       Detail  : ${f.detail}`);
    });
});

console.log(`\n${'═'.repeat(72)}`);
console.log(`  TOTAL FLAGS: ${totalFlags} (${bySeverity.CRITICAL.length} critical, ${bySeverity.HIGH.length} high, ${bySeverity.MEDIUM.length} medium)`);
console.log(`  Approve fixes? Review above and confirm with: yes / selective / no`);
console.log('═'.repeat(72) + '\n');
