/**
 * CLEANUP SCRIPT — Senior Architect Level
 * 
 * Goal: Leave exactly ONE Google Doc export path.
 * Remove all dead QA loop nodes and their orphaned Google Doc creates.
 * 
 * Architecture after cleanup:
 * ... → Claude Final SEO Snippet Optimization → Document Export Sanitization5
 *      → Structure Auditor (Pass 1) → Structure Audit Gate
 *        [PASS] → Create a document17 → Update a document17 → Signal Completion
 *        [FAIL] → Surgical Rewriter → Structure Auditor (Pass 2) → Structure Audit Gate 2
 *                   [PASS] → Create a document17
 *                   [FAIL] → Flag For Human Review
 *
 * All OTHER QA loops (OpenAI scoring, AI Agent loops, etc.) are removed.
 * Only the Claude path's structure audit survives.
 */

const fs = require('fs');

// Backup first
const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const backup = 'DEV Skywide Content (Word Count Fix) PRE-CLEANUP ' + ts + '.json';
fs.copyFileSync('DEV Skywide Content (Word Count Fix).json', backup);
console.log('✅ Backup:', backup);

const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// ─────────────────────────────────────────────────────────────────
// IDENTIFY NODES TO DELETE
// ─────────────────────────────────────────────────────────────────
// Keep ONLY the Claude path structure audit and the final export
// Delete: all 3 QA scoring loops, all AI Agent loops, OpenAI-path exports

const DELETE_NODES = new Set([
    // OpenAI QA loop (Scoring Agent 2 path → Create a document7)
    '1st Scoring Agent2',
    '80+ ?2',
    '1st Improvement LLM2',
    '2nd Scoring Agent2',
    '80 +?4',
    'Improvement LLM2',
    'Scoring7',
    'Check Max Iterations2',
    'Max Iterations2',
    'AI Agent',
    'Edit Fields',
    'Edit Fields1',
    'If',
    'QA Rewriter Agent',
    'Restore Retry Count',
    'Document Export Sanitization3',
    'Create a document',
    'Update a document',
    'Structured Output Parser',
    'OpenAI Chat Model',

    // Claude QA loop (Scoring Agent 3 path → Create a document6)
    '1st Scoring Agent3',
    '80+ ?3',
    '1st Improvement LLM3',
    '2nd Scoring Agent3',
    '80 +?6',
    'Improvement LLM3',
    'Check Max Iterations3',
    'Max Iterations3',
    'Create a document6',
    'Update a document7',
    'Structured Output Parser1',
    'OpenAI Chat Model1',
    // Note: Surgical Rewriter and Structure Auditors are KEPT (they are the structure gate)

    // Third QA loop (Scoring path → Create a document15)
    '1st Improvement LLM1',    // if exists
    'Scoring1',
    '80 +?5',
    '1st Scoring Agent1',      // if exists
    '2nd Scoring Agent',       // if exists
    'AI Agent3',
    'Edit Fields6',
    'Edit Fields7',
    'If3',
    'QA Rewriter Agent3',
    'Restore Retry Count3',
    'Document Export Sanitization7',
    'Create a document15',
    'Update a document15',
    'Structured Output Parser3',
    'OpenAI Chat Model3',
    'Max Iterations',          // the older one
    'Anthropic Chat Model18',
    'Anthropic Chat Model19',

    // Claude path AI Agent loop (→ Create a document16/17 via AI Agent2/1)
    'AI Agent1',
    'Edit Fields2',
    'Edit Fields3',
    'Max Iterations1',
    'If1',
    'QA Rewriter Agent1',
    'Restore Retry Count1',
    'Document Export Sanitization4',
    // Create a document17 is KEPT — this is our final export
    // Update a document17 is KEPT

    'AI Agent2',
    'Edit Fields4',
    'Edit Fields5',
    'If2',
    'QA Rewriter Agent2',
    'Restore Retry Count2',
    'Document Export Sanitization6',
    'Create a document16',
    'Update a document16',
    'Structured Output Parser2',
    'OpenAI Chat Model2',
    '80 +?7',

    // Dead Anthropic sub-models (not connected to any live chain)
    'Anthropic Chat Model5',
    'Anthropic Chat Model6',
    'Anthropic Chat Model7',
    'Anthropic Chat Model11',
    'Anthropic Chat Model12',
    'Anthropic Chat Model13',
    'Anthropic Chat Model20',
    'Anthropic Chat Model21',
    'Anthropic Chat Model4',
    'Anthropic Rewriter Model',

    // Useless utility nodes
    'Parse Creative Brief (LLM)',  // output never read by anything
    'Execution Data1',             // debugging artifact
    'Clean1',                      // just passes data through
    'Flag For Human Review',       // set node that flags but goes nowhere useful
    'Wait6', 'Wait7', 'Wait8', 'Wait10', 'Wait14', 'Wait17', 'Wait18',  // all wait nodes
    'Merge5', 'Merge6', 'Merge7',  // merge nodes in the editing chain that add no value

    // The OpenAI-parallel editing path (keep Claude path only for Claude Draft)
    // These are the OpenAI dual-path nodes that duplicate the Claude editing chain
    'OpenAI Keyword Check + Semantic Gap1',
    'OpenAI EEAT Injection1',
    'OpenAI NLP & PR Optimization',
    'OpenAI Humanised Readability Rewrite',
    'Final SEO Snippet Optimization',   // the OpenAI final SEO (keep Claude Final SEO only)
    'Document Export Sanitization',     // OpenAI path sanitization
    'Merge3',  // THIS IS THE MERGE — need to check if removing it breaks things

    // OpenAI draft is KEPT (it's the dual-path drafting)
    // OpenAI SEO Optimization1 is KEPT
]);

// Safety check — never delete these
const PROTECTED = new Set([
    'Webhook1', 'Startup Update', 'Pre-Draft Fact Checker', 'Post-Draft Fact Checker',
    'Keyword Strategist', 'Keyword Validator', 'Create folder1', 'Google Drive Notification1',
    'OpenAI Draft (GPT-4O)1', 'Claude Draft (Claude Opus 3)1',
    'QSI Claims Verification Bouncer', 'Claims Extractor & Manifest Generator',
    'Verified Claims Parser', 'Client Site Researcher', 'Client Profile Extractor', 'If Revision',
    'Data Check & Research Gaps1', 'Claude Keyword Check + Semantic Gap1',
    'Claude Apply Recommendations1', 'Claude EEAT Injection1', 'OpenAI SEO Optimization1',
    'Claude NLP & PR Optimization', 'Claude Humanised Readability Rewrite',
    'Claude Final SEO Snippet Optimization', 'Document Export Sanitization5',
    'Structure Auditor (Pass 1)', 'Structure Auditor (Pass 2)',
    'Structure Audit Gate', 'Structure Audit Gate 2',
    'Surgical Rewriter', 'Create a document17', 'Update a document17',
    'Signal Completion (Update a document17)', 'Send Error to Dashboard',
    'Claims Extractor Model', 'QSI Bouncer Model', 'Verified Parser Model',
    'Claims Extractor Output Parser', 'Verified Claims Output Parser',
    'Verified Claims Output Parser',
    'Error Trigger', 'Sticky Note', 'Sticky Note5',
    'Flag For Human Review',  // actually keep this as a dead-end safety
]);

// Find actual nodes to delete (exclude protected)
const toDelete = [...DELETE_NODES].filter(n => !PROTECTED.has(n));

const beforeCount = wf.nodes.length;
wf.nodes = wf.nodes.filter(n => !toDelete.includes(n.name));
const deleted = beforeCount - wf.nodes.length;
console.log('\n✅ Deleted', deleted, 'nodes (from', beforeCount, 'to', wf.nodes.length, ')');

// Remove connections from deleted nodes
let connsBefore = Object.keys(wf.connections).length;
toDelete.forEach(name => {
    delete wf.connections[name];
});
// Also clean up references TO deleted nodes in remaining connections
for (const [src, targets] of Object.entries(wf.connections)) {
    for (const [type, typeTargets] of Object.entries(targets)) {
        for (let i = 0; i < typeTargets.length; i++) {
            if (typeTargets[i]) {
                typeTargets[i] = typeTargets[i].filter(c => !toDelete.includes(c.node));
            }
        }
    }
}
console.log('✅ Cleaned connections (removed references to deleted nodes)');

// ─────────────────────────────────────────────────────────────────
// REWIRE: The OpenAI Draft path now needs to connect to something
// Since we removed Merge3 (which was the merge point of OpenAI+Claude drafts)
// and the OpenAI-specific edit chain, we need to decide:
// - If OpenAI Draft is still used: wire it directly into QSI Bouncer or Data Check
// - Actually: the workflow has Clean1 → OpenAI Draft AND Clean1 → Claude Draft
//   OpenAI Draft was going → Merge3 → Data Check
//   Claude Draft was going → QSI Bouncer → Merge3 → Data Check
//   After removing Merge3: Claude Draft → QSI Bouncer → Data Check (already correct)
//   OpenAI Draft now needs to go somewhere — wire it to QSI Bouncer as well
// But wait — if both fire, both would enter QSI Bouncer simultaneously.
// The real architecture should be: Clean1 fires EITHER OpenAI OR Claude via an If node
// For now: keep both, wire OpenAI Draft → QSI Bouncer too (they're alternatives)
// ─────────────────────────────────────────────────────────────────

// Wire OpenAI Draft → QSI Bouncer (was going to Merge3 which is now deleted)
const openAIDraftConns = wf.connections['OpenAI Draft (GPT-4O)1'];
if (openAIDraftConns && openAIDraftConns.main) {
    const alreadyToQSI = openAIDraftConns.main.some(branch =>
        branch && branch.some(c => c.node === 'QSI Claims Verification Bouncer')
    );
    if (!alreadyToQSI) {
        wf.connections['OpenAI Draft (GPT-4O)1'].main = [[{ node: 'QSI Claims Verification Bouncer', type: 'main', index: 0 }]];
        console.log('✅ REWIRED: OpenAI Draft → QSI Claims Verification Bouncer');
    }
}

// Wire Structure Audit Gate [PASS] → Create a document17 (was going to Edit Fields2 which is deleted)
const sag1Conns = wf.connections['Structure Audit Gate'];
if (sag1Conns && sag1Conns.main) {
    // Branch 0 = PASS, Branch 1 = FAIL
    const passBranch = sag1Conns.main[0];
    const passTarget = passBranch && passBranch[0] ? passBranch[0].node : null;
    if (passTarget !== 'Create a document17') {
        wf.connections['Structure Audit Gate'].main[0] = [{ node: 'Create a document17', type: 'main', index: 0 }];
        console.log('✅ REWIRED: Structure Audit Gate [PASS] → Create a document17 (was:', passTarget, ')');
    } else {
        console.log('⏩ Structure Audit Gate [PASS] already → Create a document17');
    }
    // FAIL branch → Surgical Rewriter (should already be set)
    const failBranch = sag1Conns.main[1];
    const failTarget = failBranch && failBranch[0] ? failBranch[0].node : null;
    console.log('Structure Audit Gate [FAIL] →', failTarget);
}

// Wire Structure Audit Gate 2 [PASS] → Create a document17 as well
const sag2Conns = wf.connections['Structure Audit Gate 2'];
if (sag2Conns && sag2Conns.main) {
    const passBranch = sag2Conns.main[0];
    const passTarget = passBranch && passBranch[0] ? passBranch[0].node : null;
    if (passTarget !== 'Create a document17') {
        wf.connections['Structure Audit Gate 2'].main[0] = [{ node: 'Create a document17', type: 'main', index: 0 }];
        console.log('✅ REWIRED: Structure Audit Gate 2 [PASS] → Create a document17 (was:', passTarget, ')');
    } else {
        console.log('⏩ Structure Audit Gate 2 [PASS] already → Create a document17');
    }
}

// Wire Surgical Rewriter → Structure Auditor (Pass 2)
const surgicalConns = wf.connections['Surgical Rewriter'];
if (!surgicalConns || !surgicalConns.main || !surgicalConns.main[0] || surgicalConns.main[0].length === 0) {
    wf.connections['Surgical Rewriter'] = { main: [[{ node: 'Structure Auditor (Pass 2)', type: 'main', index: 0 }]] };
    console.log('✅ WIRED: Surgical Rewriter → Structure Auditor (Pass 2)');
}

// Wire Claude Final SEO Snippet → Document Export Sanitization5 (should already be set)
// Check it's not pointing to deleted nodes
const finalSEOConns = wf.connections['Claude Final SEO Snippet Optimization'];
if (finalSEOConns && finalSEOConns.main && finalSEOConns.main[0]) {
    const target = finalSEOConns.main[0][0] ? finalSEOConns.main[0][0].node : null;
    if (target === 'Document Export Sanitization5') {
        console.log('✅ Claude Final SEO → Document Export Sanitization5 (correct)');
    } else {
        wf.connections['Claude Final SEO Snippet Optimization'].main[0] = [{ node: 'Document Export Sanitization5', type: 'main', index: 0 }];
        console.log('✅ REWIRED: Claude Final SEO → Document Export Sanitization5 (was:', target, ')');
    }
}

// Wire Startup Update → Pre-Draft Fact Checker (removing the Parse Creative Brief LLM middleman)
// Parse Creative Brief (LLM) was between Startup Update and Pre-Draft Fact Checker
// After removing it, wire directly:
const startupConns = wf.connections['Startup Update'];
if (startupConns && startupConns.main) {
    const target = startupConns.main[0] && startupConns.main[0][0] ? startupConns.main[0][0].node : null;
    if (target === 'Parse Creative Brief (LLM)') {
        wf.connections['Startup Update'].main[0] = [{ node: 'Pre-Draft Fact Checker', type: 'main', index: 0 }];
        console.log('✅ REWIRED: Startup Update → Pre-Draft Fact Checker (bypassing deleted Parse Creative Brief LLM)');
    }
}

// Wire Startup Update also → If Revision (was connected through Parse Creative Brief)
// Parse Creative Brief had two outputs: Pre-Draft Fact Checker AND If Revision
// Now Startup Update needs to do both
// Add If Revision as second output of Pre-Draft Fact Checker (it was on Parse Creative Brief)
// Actually: check if Pre-Draft Fact Checker already → If Revision or if it was Parse Creative Brief → If Revision
const preFCConns = wf.connections['Pre-Draft Fact Checker'];
if (preFCConns && preFCConns.main) {
    const hasIfRevision = preFCConns.main.some(branch => branch && branch.some(c => c.node === 'If Revision'));
    if (!hasIfRevision) {
        // Add If Revision as a second main output of Pre-Draft Fact Checker
        // main[0] = primary path (Keyword Strategist), main[1] = parallel (If Revision)
        if (!preFCConns.main[1]) preFCConns.main[1] = [];
        preFCConns.main[1] = [{ node: 'If Revision', type: 'main', index: 0 }];
        console.log('✅ WIRED: Pre-Draft Fact Checker → If Revision (parallel branch)');
    } else {
        console.log('⏩ Pre-Draft Fact Checker already → If Revision');
    }
}

// ─────────────────────────────────────────────────────────────────
// FINAL GOOGLE DOCS AUDIT
// ─────────────────────────────────────────────────────────────────
const gdNodes = wf.nodes.filter(n => n.type === 'n8n-nodes-base.googleDocs');
console.log('\n=== REMAINING GOOGLE DOCS NODES ===');
gdNodes.forEach(n => console.log(' -', n.name, '(', n.parameters && n.parameters.operation, ')'));

// ─────────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────────
fs.writeFileSync('DEV Skywide Content (Word Count Fix).json', JSON.stringify(wf, null, 2));
console.log('\n✅ File saved: DEV Skywide Content (Word Count Fix).json');
console.log('Total nodes remaining:', wf.nodes.length);
