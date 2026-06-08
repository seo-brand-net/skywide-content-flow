/**
 * HARDENED CLEANUP — Final Version
 * 
 * Based on user instructions:
 * 1. Remove ALL OpenAI pipeline editing chain — keep Claude only
 * 2. Remove OpenAI Draft — keep Claude Draft only
 * 3. Remove all 3 scoring loops (AI Agents, Scoring Agents, QA Rewriters)
 * 4. Surgical Rewriter stays — it IS the improvement mechanism (not a loop)
 * 5. Remove Execution Data1 (no references), Clean1 (refs only in deleted nodes)
 * 6. Keep Structured Output Parsers as JSON schema providers (user confirmed)
 * 7. Wire: Claude Draft → QSI Bouncer → Data Check → Post Draft → Claude Keyword Check
 *           → Claude Apply Recs → Claude EEAT → OpenAI SEO → Claude NLP → Claude Humanise
 *           → Claude Final SEO → Doc Export Sanitization5
 *           → Structure Auditor Pass1 → Gate
 *             [PASS] → Create a document17 → Update a document17 → Signal Completion
 *             [FAIL] → Surgical Rewriter → Structure Auditor Pass2 → Gate2
 *                        [PASS] → Create a document17
 *                        [FAIL] → Flag For Human Review
 * 
 * PROTECTED (never deleted regardless):
 * Parse Creative Brief (LLM), Pre-Draft Fact Checker, Post-Draft Fact Checker,
 * Structure Auditor Pass 1 & 2, Structure Audit Gate 1 & 2, Surgical Rewriter,
 * Document Export Sanitization5, Client Profile Extractor, Flag For Human Review,
 * All Claims/Bouncer nodes, Create a document17, Update a document17, Signal Completion
 */

const fs = require('fs');

const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const backup = 'DEV Skywide Content (Word Count Fix) CLEANUP-V2 ' + ts + '.json';
fs.copyFileSync('DEV Skywide Content (Word Count Fix).json', backup);
console.log('✅ Backup:', backup);

const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// ─────────────────────────────────────────────────────────────────
// PROTECTED — Never delete these
// ─────────────────────────────────────────────────────────────────
const PROTECTED = new Set([
    // Webhook & entry
    'Webhook1', 'Startup Update',
    // Creative brief (integral per user)
    'Parse Creative Brief (LLM)',
    // Fact checkers
    'Pre-Draft Fact Checker', 'Post-Draft Fact Checker',
    // Keyword engine
    'Keyword Strategist', 'Keyword Validator',
    // Drive / folder setup
    'Create folder1', 'Google Drive Notification1',
    // Routing
    'If Revision',
    // Client research
    'Client Site Researcher', 'Client Profile Extractor',
    // Claims pipeline
    'Claims Extractor & Manifest Generator', 'Verified Claims Parser',
    'QSI Claims Verification Bouncer',
    'Claims Extractor Model', 'QSI Bouncer Model', 'Verified Parser Model',
    'Claims Extractor Output Parser', 'Verified Claims Output Parser',
    // Claude Draft
    'Claude Draft (Claude Opus 3)1',
    // Claude editing chain
    'Claude Keyword Check + Semantic Gap1',
    'Claude Apply Recommendations1',
    'Claude EEAT Injection1',
    'OpenAI SEO Optimization1',       // kept: sits between EEAT and NLP, no OpenAI-chain duplicate
    'Claude NLP & PR Optimization',
    'Claude Humanised Readability Rewrite',
    'Claude Final SEO Snippet Optimization',
    // Final sanitization & structure audit
    'Document Export Sanitization5',
    'Structure Auditor (Pass 1)',
    'Structure Auditor (Pass 2)',
    'Structure Audit Gate',
    'Structure Audit Gate 2',
    'Surgical Rewriter',
    'Flag For Human Review',
    // Export
    'Create a document17', 'Update a document17',
    'Signal Completion (Update a document17)',
    // Error handling
    'Send Error to Dashboard', 'Error Trigger',
    // Stickies
    'Sticky Note', 'Sticky Note5',
    // Structured output parsers (user confirmed these stay as JSON schema providers)
    'Structured Output Parser', 'Structured Output Parser1',
    'Structured Output Parser2', 'Structured Output Parser3',
    'Verified Claims Output Parser', 'Claims Extractor Output Parser',
]);

// ─────────────────────────────────────────────────────────────────
// DELETE LIST — Everything not protected and not needed
// ─────────────────────────────────────────────────────────────────
const DELETE = new Set([
    // OpenAI Draft (removing in favour of Claude Draft only)
    'OpenAI Draft (GPT-4O)1',

    // Merge & Wait infrastructure (only exists to merge OpenAI+Claude paths)
    'Merge3', 'Merge5', 'Merge6', 'Merge7',
    'Wait6', 'Wait7', 'Wait8', 'Wait10', 'Wait14', 'Wait17', 'Wait18',

    // OpenAI editing chain (replaced by Claude equivalents)
    'OpenAI Keyword Check + Semantic Gap1',
    'OpenAI EEAT Injection1',
    'OpenAI NLP & PR Optimization',
    'OpenAI Humanised Readability Rewrite',
    'Final SEO Snippet Optimization',     // OpenAI version — Claude Final SEO Snippet Optimization stays
    'Document Export Sanitization',       // OpenAI path sanitization

    // Scoring Loop A — OpenAI path
    '1st Scoring Agent2', '80+ ?2',
    '1st Improvement LLM2', '2nd Scoring Agent2', '80 +?4',
    'Improvement LLM2', 'Scoring7', 'Check Max Iterations2', 'Max Iterations2',
    'AI Agent', 'Edit Fields', 'Edit Fields1', 'If', 'Max Iterations',
    'QA Rewriter Agent', 'Restore Retry Count',
    'Document Export Sanitization3',
    'Create a document', 'Update a document',
    'Create a document7', 'Update a document6',

    // Scoring Loop B — Third loop (80 +?5 path)
    '80 +?5',
    'AI Agent3', 'Edit Fields6', 'Edit Fields7', 'If3',
    'QA Rewriter Agent3', 'Restore Retry Count3',
    'Document Export Sanitization7',
    'Create a document15', 'Update a document15',
    'Anthropic Chat Model18', 'Anthropic Chat Model19',

    // Scoring Loop C — Claude path scoring
    '1st Scoring Agent3', '80+ ?3',
    '1st Improvement LLM3', '2nd Scoring Agent3', '80 +?6',
    'Improvement LLM3', 'Check Max Iterations3', 'Max Iterations3',
    'AI Agent1', 'Edit Fields2', 'Edit Fields3', 'Max Iterations1', 'If1',
    'QA Rewriter Agent1', 'Restore Retry Count1',
    'Document Export Sanitization4',
    'Create a document6', 'Update a document7',
    '80 +?7', 'Scoring1',
    'AI Agent2', 'Edit Fields4', 'Edit Fields5', 'If2',
    'QA Rewriter Agent2', 'Restore Retry Count2',
    'Document Export Sanitization6',
    'Create a document16', 'Update a document16',

    // Dead orphaned sub-nodes
    'Anthropic Chat Model4',
    'Anthropic Chat Model5', 'Anthropic Chat Model6', 'Anthropic Chat Model7',
    'Anthropic Chat Model11', 'Anthropic Chat Model12', 'Anthropic Chat Model13',
    'Anthropic Chat Model20', 'Anthropic Chat Model21',
    'Anthropic Rewriter Model',
    'OpenAI Chat Model', 'OpenAI Chat Model1', 'OpenAI Chat Model2', 'OpenAI Chat Model3',

    // Utility artifacts with no dependencies
    'Execution Data1',
    'Clean1',
]);

// Safety: never delete protected nodes
const safeDelete = [...DELETE].filter(n => !PROTECTED.has(n));
const blockedDelete = [...DELETE].filter(n => PROTECTED.has(n));
if (blockedDelete.length > 0) {
    console.log('⚠️  BLOCKED from deleting protected nodes:', blockedDelete.join(', '));
}

// Delete nodes
const before = wf.nodes.length;
wf.nodes = wf.nodes.filter(n => !safeDelete.includes(n.name));
console.log('✅ Deleted', before - wf.nodes.length, 'nodes (' + before + ' → ' + wf.nodes.length + ')');

// Delete connections FROM deleted nodes
safeDelete.forEach(name => delete wf.connections[name]);

// Remove references TO deleted nodes in remaining connections
for (const [src, targets] of Object.entries(wf.connections)) {
    for (const [type, typeTargets] of Object.entries(targets)) {
        for (let i = 0; i < typeTargets.length; i++) {
            if (typeTargets[i]) {
                typeTargets[i] = typeTargets[i].filter(c => !safeDelete.includes(c.node));
            }
        }
    }
}
console.log('✅ Cleaned all stale connection references');

// ─────────────────────────────────────────────────────────────────
// REWIRING — Build the clean single-path pipeline
// ─────────────────────────────────────────────────────────────────

function wire(from, to, port = 'main', inputIdx = 0) {
    if (!wf.connections[from]) wf.connections[from] = {};
    if (!wf.connections[from][port]) wf.connections[from][port] = [[]];
    // Ensure array slot exists for this input index
    while (wf.connections[from][port].length <= inputIdx) wf.connections[from][port].push([]);
    // Check not already wired
    const already = wf.connections[from][port][inputIdx].some(c => c.node === to);
    if (!already) {
        wf.connections[from][port][inputIdx].push({ node: to, type: port, index: inputIdx });
        console.log('✅ WIRED [' + port + ']: ' + from + ' → ' + to);
    }
}

function setWire(from, to, branchIdx = 0) {
    if (!wf.connections[from]) wf.connections[from] = { main: [[]] };
    if (!wf.connections[from].main) wf.connections[from].main = [[]];
    while (wf.connections[from].main.length <= branchIdx) wf.connections[from].main.push([]);
    wf.connections[from].main[branchIdx] = [{ node: to, type: 'main', index: 0 }];
    console.log('✅ SET WIRE branch[' + branchIdx + ']: ' + from + ' → ' + to);
}

// 1. Keyword Validator → Create folder1 (previously Execution Data1 was in between)
setWire('Keyword Validator', 'Create folder1');

// 2. Create folder1 → Claude Draft (was going to Clean1 first)
setWire('Create folder1', 'Claude Draft (Claude Opus 3)1');
// Create folder1 → Google Drive Notification1 (parallel)
wire('Create folder1', 'Google Drive Notification1');

// 3. Claude Draft → QSI Claims Verification Bouncer (already wired)
// Check and confirm
const cdConns = wf.connections['Claude Draft (Claude Opus 3)1'];
const cdTarget = cdConns && cdConns.main && cdConns.main[0] && cdConns.main[0][0];
if (cdTarget && cdTarget.node === 'QSI Claims Verification Bouncer') {
    console.log('✅ CONFIRMED: Claude Draft → QSI Claims Verification Bouncer');
} else {
    setWire('Claude Draft (Claude Opus 3)1', 'QSI Claims Verification Bouncer');
}

// 4. QSI Bouncer → Data Check & Research Gaps1 (directly, Merge3 is gone)
setWire('QSI Claims Verification Bouncer', 'Data Check & Research Gaps1');

// 5. Data Check → Post-Draft Fact Checker (already exists, verify)
const dcConns = wf.connections['Data Check & Research Gaps1'];
const dcTarget = dcConns && dcConns.main && dcConns.main[0] && dcConns.main[0][0];
if (dcTarget && dcTarget.node === 'Post-Draft Fact Checker') {
    console.log('✅ CONFIRMED: Data Check → Post-Draft Fact Checker');
} else {
    setWire('Data Check & Research Gaps1', 'Post-Draft Fact Checker');
}

// 6. Post-Draft Fact Checker → Claude Keyword Check (was going through OpenAI Keyword Check first)
setWire('Post-Draft Fact Checker', 'Claude Keyword Check + Semantic Gap1');

// 7. Claude Keyword Check → Claude Apply Recommendations
//    (was going through Merge5 + Wait18 intermediate)
setWire('Claude Keyword Check + Semantic Gap1', 'Claude Apply Recommendations1');

// 8. Claude Apply Recommendations → Claude EEAT Injection
//    (was going through OpenAI EEAT + Merge6 + Wait14)
setWire('Claude Apply Recommendations1', 'Claude EEAT Injection1');

// 9. Claude EEAT Injection → OpenAI SEO Optimization1
//    (OpenAI SEO is kept as the one retained OpenAI step)
setWire('Claude EEAT Injection1', 'OpenAI SEO Optimization1');

// 10. OpenAI SEO Optimization1 → Claude NLP & PR Optimization
//     (was going through Wait17 + OpenAI NLP first, then Merge7)
setWire('OpenAI SEO Optimization1', 'Claude NLP & PR Optimization');

// 11. Claude NLP → Claude Humanised Readability Rewrite
//     (was going through Wait7 → Merge7 → Wait6 before)
setWire('Claude NLP & PR Optimization', 'Claude Humanised Readability Rewrite');

// 12. Claude Humanised Readability Rewrite → Claude Final SEO Snippet Optimization
//     (was going through Wait10)
setWire('Claude Humanised Readability Rewrite', 'Claude Final SEO Snippet Optimization');

// 13. Claude Final SEO Snippet Optimization → Document Export Sanitization5
const finalSEOConns = wf.connections['Claude Final SEO Snippet Optimization'];
const fsTarget = finalSEOConns && finalSEOConns.main && finalSEOConns.main[0] && finalSEOConns.main[0][0];
if (fsTarget && fsTarget.node === 'Document Export Sanitization5') {
    console.log('✅ CONFIRMED: Claude Final SEO → Document Export Sanitization5');
} else {
    setWire('Claude Final SEO Snippet Optimization', 'Document Export Sanitization5');
}

// 14. Document Export Sanitization5 → Structure Auditor (Pass 1)
setWire('Document Export Sanitization5', 'Structure Auditor (Pass 1)');

// 15. Structure Auditor (Pass 1) → Structure Audit Gate
setWire('Structure Auditor (Pass 1)', 'Structure Audit Gate');

// 16. Structure Audit Gate:
//     [PASS = branch 0] → Create a document17
//     [FAIL = branch 1] → Surgical Rewriter
wf.connections['Structure Audit Gate'] = {
    main: [
        [{ node: 'Create a document17', type: 'main', index: 0 }],
        [{ node: 'Surgical Rewriter', type: 'main', index: 0 }]
    ]
};
console.log('✅ SET: Structure Audit Gate [PASS → Create a document17] [FAIL → Surgical Rewriter]');

// 17. Surgical Rewriter → Structure Auditor (Pass 2)
setWire('Surgical Rewriter', 'Structure Auditor (Pass 2)');

// 18. Structure Auditor (Pass 2) → Structure Audit Gate 2
setWire('Structure Auditor (Pass 2)', 'Structure Audit Gate 2');

// 19. Structure Audit Gate 2:
//     [PASS = branch 0] → Create a document17
//     [FAIL = branch 1] → Flag For Human Review
wf.connections['Structure Audit Gate 2'] = {
    main: [
        [{ node: 'Create a document17', type: 'main', index: 0 }],
        [{ node: 'Flag For Human Review', type: 'main', index: 0 }]
    ]
};
console.log('✅ SET: Structure Audit Gate 2 [PASS → Create a document17] [FAIL → Flag For Human Review]');

// 20. Create a document17 → Update a document17 → Signal Completion
setWire('Create a document17', 'Update a document17');
setWire('Update a document17', 'Signal Completion (Update a document17)');

// 21. Pre-Draft Fact Checker → If Revision (parallel branch alongside Keyword Strategist)
if (!wf.connections['Pre-Draft Fact Checker']) wf.connections['Pre-Draft Fact Checker'] = { main: [[],[]] };
if (!wf.connections['Pre-Draft Fact Checker'].main[1] || wf.connections['Pre-Draft Fact Checker'].main[1].length === 0) {
    wf.connections['Pre-Draft Fact Checker'].main[1] = [{ node: 'If Revision', type: 'main', index: 0 }];
    console.log('✅ WIRED: Pre-Draft Fact Checker → If Revision (parallel branch)');
}

// ─────────────────────────────────────────────────────────────────
// FINAL VERIFICATION — count Google Docs in live path
// ─────────────────────────────────────────────────────────────────
const outgoing = {};
for (const [src, targets] of Object.entries(wf.connections)) {
    for (const [type, typeTargets] of Object.entries(targets)) {
        for (const tgts of typeTargets) {
            for (const t of tgts) {
                if (!outgoing[src]) outgoing[src] = [];
                outgoing[src].push({ node: t.node, type });
            }
        }
    }
}

const liveVisited = new Set();
const liveGDocs = [];
function traceLive(start, d = 0) {
    if (liveVisited.has(start) || d > 60) return;
    liveVisited.add(start);
    const n = wf.nodes.find(x => x.name === start);
    if (n && n.type === 'n8n-nodes-base.googleDocs') liveGDocs.push(start);
    (outgoing[start] || []).filter(c => c.type === 'main').forEach(c => traceLive(c.node, d+1));
}
traceLive('Webhook1');

console.log('\n=== POST-CLEANUP LIVE PIPELINE ===');
const lvVisited2 = new Set();
function showLive(start, d = 0) {
    if (lvVisited2.has(start) || d > 60) return;
    lvVisited2.add(start);
    const n = wf.nodes.find(x => x.name === start);
    const type = n ? n.type.split('.').pop() : '?';
    console.log('  '.repeat(d) + start + ' [' + type + ']');
    (outgoing[start] || []).filter(c => c.type === 'main').forEach(c => showLive(c.node, d+1));
}
showLive('Webhook1');

console.log('\n=== GOOGLE DOCS IN LIVE PATH: ' + liveGDocs.length + ' ===');
liveGDocs.forEach(n => console.log((n === 'Create a document17' ? '✅' : '❌') + ' ' + n));

const deadCount = wf.nodes.filter(n =>
    !liveVisited.has(n.name) &&
    !['n8n-nodes-base.stickyNote','n8n-nodes-base.errorTrigger'].includes(n.type) &&
    !n.type.includes('lmChatAnthropic') && !n.type.includes('lmChatOpenAi') &&
    !n.type.includes('outputParserStructured')
).length;
console.log('Remaining dead non-sub nodes:', deadCount);

// Save
fs.writeFileSync('DEV Skywide Content (Word Count Fix).json', JSON.stringify(wf, null, 2));
console.log('\n✅ SAVED — Total nodes:', wf.nodes.length);
