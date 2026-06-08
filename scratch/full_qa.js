const fs = require('fs');
const legit = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

const issues = [];
const passes = [];

function pass(msg) { passes.push('✅ ' + msg); }
function fail(msg) { issues.push('❌ ' + msg); }
function warn(msg) { issues.push('⚠️  ' + msg); }

// Helper: get raw text from a node — reads the actual message string, not JSON-escaped wrapper
function getNodeText(node) {
    if (!node || !node.parameters) return '';
    if (node.parameters.text) return node.parameters.text;
    if (node.parameters.messages) {
        const mv = node.parameters.messages.messageValues;
        // Read the raw .message string, not JSON.stringify of the whole array
        if (mv && Array.isArray(mv) && mv[0] && mv[0].message) return mv[0].message;
        const m = node.parameters.messages.message;
        if (m) return JSON.stringify(m);
    }
    if (node.parameters.options && node.parameters.options.systemMessage)
        return node.parameters.options.systemMessage;
    return '';
}

// Build connection map
const outgoing = {};
const incoming = {};
for (const [src, targets] of Object.entries(legit.connections)) {
    for (const [type, typeTargets] of Object.entries(targets)) {
        for (const tgts of typeTargets) {
            for (const t of tgts) {
                if (!outgoing[src]) outgoing[src] = [];
                outgoing[src].push({ node: t.node, type });
                if (!incoming[t.node]) incoming[t.node] = [];
                incoming[t.node].push({ node: src, type });
            }
        }
    }
}

const nodeNames = new Set(legit.nodes.map(n => n.name));

console.log('══════════════════════════════════════════════════════════');
console.log('  FULL QA AUDIT — DEV Skywide Content (Word Count Fix)');
console.log('══════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────
// SECTION 1: NODE PRESENCE
// ─────────────────────────────────────────────────────────────────
console.log('── SECTION 1: REQUIRED NODE PRESENCE ─────────────────────');
const requiredNodes = [
    'Webhook1', 'Startup Update', 'Parse Creative Brief (LLM)',
    'Pre-Draft Fact Checker', 'Keyword Strategist', 'Keyword Validator',
    'Create folder1',
    // NOTE: Clean1 and OpenAI Draft removed intentionally in cleanup
    'Claude Draft (Claude Opus 3)1',
    'QSI Claims Verification Bouncer',
    'Claims Extractor & Manifest Generator', 'Verified Claims Parser',
    'Claims Extractor Model', 'QSI Bouncer Model', 'Verified Parser Model',
    'Claims Extractor Output Parser', 'Verified Claims Output Parser',
    'Client Site Researcher', 'Client Profile Extractor',
    'If Revision',
    'Data Check & Research Gaps1', 'Post-Draft Fact Checker',
    'Claude Keyword Check + Semantic Gap1',
    'Claude Apply Recommendations1',
    'Claude EEAT Injection1',
    'OpenAI SEO Optimization1',
    'Claude NLP & PR Optimization',
    'Claude Humanised Readability Rewrite',
    'Claude Final SEO Snippet Optimization',
    'Document Export Sanitization5',
    'Structure Auditor (Pass 1)', 'Structure Auditor (Pass 2)',
    'Structure Audit Gate', 'Structure Audit Gate 2',
    'Surgical Rewriter', 'Flag For Human Review',
    'Create a document17', 'Update a document17',
    'Signal Completion (Update a document17)',
    'Google Drive Notification1',
];
requiredNodes.forEach(n => {
    if (nodeNames.has(n)) pass('Node exists: ' + n);
    else fail('MISSING NODE: ' + n);
});

// ─────────────────────────────────────────────────────────────────
// SECTION 2: PIPELINE WIRING
// ─────────────────────────────────────────────────────────────────
console.log('\n── SECTION 2: PIPELINE WIRING ─────────────────────────────');

function checkWire(from, to, label) {
    const conns = legit.connections[from];
    const connected = conns && conns.main && conns.main.some(branch =>
        branch && branch.some(c => c.node === to)
    );
    if (connected) pass(label || (from + ' → ' + to));
    else fail('NOT WIRED: ' + (label || (from + ' → ' + to)));
}

// Core spine
checkWire('Webhook1', 'Startup Update');
checkWire('Startup Update', 'Parse Creative Brief (LLM)');
checkWire('Parse Creative Brief (LLM)', 'Pre-Draft Fact Checker');
checkWire('Parse Creative Brief (LLM)', 'If Revision');
checkWire('Pre-Draft Fact Checker', 'Keyword Strategist');
// NOTE: Execution Data1 removed — KW Strategist now wires directly to KW Validator
checkWire('Keyword Strategist', 'Keyword Validator');
checkWire('Keyword Validator', 'Create folder1');
checkWire('Create folder1', 'Claude Draft (Claude Opus 3)1');
checkWire('Create folder1', 'Google Drive Notification1');
// NOTE: Clean1 and OpenAI Draft removed — Create folder1 wires directly to Claude Draft
checkWire('Claude Draft (Claude Opus 3)1', 'QSI Claims Verification Bouncer', 'Claude Draft → QSI Bouncer');
checkWire('QSI Claims Verification Bouncer', 'Data Check & Research Gaps1', 'QSI Bouncer → Data Check');
// Client research path
checkWire('If Revision', 'Client Site Researcher', 'If Revision → Client Site Researcher');
checkWire('Client Site Researcher', 'Client Profile Extractor');
checkWire('Client Profile Extractor', 'Claims Extractor & Manifest Generator');
checkWire('Claims Extractor & Manifest Generator', 'Verified Claims Parser');
// Post-draft editing chain
checkWire('Data Check & Research Gaps1', 'Post-Draft Fact Checker');
checkWire('Post-Draft Fact Checker', 'Claude Keyword Check + Semantic Gap1');
checkWire('Claude Keyword Check + Semantic Gap1', 'Claude Apply Recommendations1');
checkWire('Claude Apply Recommendations1', 'Claude EEAT Injection1');
checkWire('Claude EEAT Injection1', 'OpenAI SEO Optimization1');
checkWire('OpenAI SEO Optimization1', 'Claude NLP & PR Optimization');
checkWire('Claude NLP & PR Optimization', 'Claude Humanised Readability Rewrite');
checkWire('Claude Humanised Readability Rewrite', 'Claude Final SEO Snippet Optimization');
checkWire('Claude Final SEO Snippet Optimization', 'Document Export Sanitization5');
checkWire('Document Export Sanitization5', 'Structure Auditor (Pass 1)');
checkWire('Structure Auditor (Pass 1)', 'Structure Audit Gate');
checkWire('Structure Audit Gate', 'Create a document17', 'Structure Audit Gate [PASS] → Create a document17');
checkWire('Structure Audit Gate', 'Surgical Rewriter', 'Structure Audit Gate [FAIL] → Surgical Rewriter');
checkWire('Surgical Rewriter', 'Structure Auditor (Pass 2)');
checkWire('Structure Auditor (Pass 2)', 'Structure Audit Gate 2');
checkWire('Structure Audit Gate 2', 'Create a document17', 'Structure Audit Gate 2 [PASS] → Create a document17');
checkWire('Structure Audit Gate 2', 'Flag For Human Review', 'Structure Audit Gate 2 [FAIL] → Flag For Human Review');
checkWire('Create a document17', 'Update a document17');
checkWire('Update a document17', 'Signal Completion (Update a document17)');

// Check sub-node connections (model → chain)
function checkSubWire(from, to, portType) {
    const conns = legit.connections[from];
    const connected = conns && conns[portType] && conns[portType].some(branch =>
        branch && branch.some(c => c.node === to)
    );
    if (connected) pass('Sub-wire [' + portType + ']: ' + from + ' → ' + to);
    else fail('Sub-wire MISSING [' + portType + ']: ' + from + ' → ' + to);
}

checkSubWire('Claims Extractor Model', 'Claims Extractor & Manifest Generator', 'ai_languageModel');
checkSubWire('QSI Bouncer Model', 'QSI Claims Verification Bouncer', 'ai_languageModel');
checkSubWire('Verified Parser Model', 'Verified Claims Parser', 'ai_languageModel');
checkSubWire('Claims Extractor Output Parser', 'Claims Extractor & Manifest Generator', 'ai_outputParser');
checkSubWire('Verified Claims Output Parser', 'Verified Claims Parser', 'ai_outputParser');

// ─────────────────────────────────────────────────────────────────
// SECTION 3: NODE REFERENCES (expression variables)
// ─────────────────────────────────────────────────────────────────
console.log('\n── SECTION 3: NODE REFERENCES ─────────────────────────────');

function checkRef(nodeName, refNodeName, label) {
    const node = legit.nodes.find(n => n.name === nodeName);
    const text = getNodeText(node);
    const pattern = "$('" + refNodeName + "')";
    if (text.includes(pattern)) pass(label || (nodeName + ' references ' + refNodeName));
    else fail('BAD REFERENCE: ' + nodeName + ' does NOT reference ' + refNodeName + ' (looking for: ' + pattern + ')');
}

// Claude Draft references
checkRef('Claude Draft (Claude Opus 3)1', 'Webhook1', 'Claude Draft → Webhook1');
checkRef('Claude Draft (Claude Opus 3)1', 'Keyword Strategist', 'Claude Draft → Keyword Strategist');
checkRef('Claude Draft (Claude Opus 3)1', 'Client Site Researcher', 'Claude Draft → Client Site Researcher');
checkRef('Claude Draft (Claude Opus 3)1', 'Client Profile Extractor', 'Claude Draft → Client Profile Extractor');
checkRef('Claude Draft (Claude Opus 3)1', 'Claims Extractor & Manifest Generator', 'Claude Draft → Claims Extractor (placement manifest)');
checkRef('Claude Draft (Claude Opus 3)1', 'Pre-Draft Fact Checker', 'Claude Draft → Pre-Draft Fact Checker');

// QSI Bouncer references
checkRef('QSI Claims Verification Bouncer', 'Claims Extractor & Manifest Generator', 'QSI Bouncer → Claims Extractor (manifest)');

// Claims Extractor references
checkRef('Claims Extractor & Manifest Generator', 'Webhook1', 'Claims Extractor → Webhook1 (brief)');

// Verified Claims Parser references
checkRef('Verified Claims Parser', 'Pre-Draft Fact Checker', 'Verified Claims Parser → Pre-Draft Fact Checker');
checkRef('Verified Claims Parser', 'Claims Extractor & Manifest Generator', 'Verified Claims Parser → Claims Extractor (manifest)');

// Downstream editors reference the article from previous node correctly
const downstreamEditors = [
    { name: 'Data Check & Research Gaps1', mustRef: 'Claude Draft (Claude Opus 3)1' },
    { name: 'Claude Keyword Check + Semantic Gap1', mustRef: 'Keyword Strategist' },
    { name: 'Claude Apply Recommendations1', mustRef: 'Keyword Strategist' },
    { name: 'Claude EEAT Injection1', mustRef: 'Keyword Strategist' },
    { name: 'Claude NLP & PR Optimization', mustRef: 'Keyword Strategist' },
    { name: 'Claude Humanised Readability Rewrite', mustRef: 'Keyword Strategist' },
    { name: 'Claude Final SEO Snippet Optimization', mustRef: 'Keyword Strategist' },
];
downstreamEditors.forEach(e => {
    checkRef(e.name, e.mustRef, e.name + ' → ' + e.mustRef);
});

// ─────────────────────────────────────────────────────────────────
// SECTION 4: EDITORIAL RULES IN PROMPTS
// ─────────────────────────────────────────────────────────────────
console.log('\n── SECTION 4: EDITORIAL RULES IN PROMPTS ──────────────────');

const nodesToCheckRules = [
    'Claude Draft (Claude Opus 3)1',
    'QSI Claims Verification Bouncer',
    'Claude Keyword Check + Semantic Gap1',
    'Claude Apply Recommendations1',
    'Claude EEAT Injection1',
    'Claude NLP & PR Optimization',
    'Claude Humanised Readability Rewrite',
    'Claude Final SEO Snippet Optimization',
];

nodesToCheckRules.forEach(name => {
    const node = legit.nodes.find(n => n.name === name);
    const text = getNodeText(node);
    const hasEmDash = text.includes('em-dash') || text.includes('em dash');
    const hasMetaTitle = text.includes('Meta Title');
    const hasClosing = text.includes('CLOSING') || text.includes('closing paragraph') || text.includes('final paragraph');
    const hasFirstPerson = text.includes('first-person') || text.includes('first person');

    if (hasEmDash) pass(name + ': em-dash ban present');
    else fail(name + ': em-dash ban MISSING');

    if (hasMetaTitle) pass(name + ': Meta Title enforcement present');
    else warn(name + ': Meta Title enforcement MISSING');

    if (hasClosing) pass(name + ': Closing paragraph rule present');
    else warn(name + ': Closing paragraph rule MISSING');
});

// ─────────────────────────────────────────────────────────────────
// SECTION 5: KEYWORD STRATEGIST INJECTION FIELDS
// ─────────────────────────────────────────────────────────────────
console.log('\n── SECTION 5: KEYWORD STRATEGIST FIELDS ───────────────────');
const ks = legit.nodes.find(n => n.name === 'Keyword Strategist');
const ksCode = ks ? (ks.parameters.jsCode || ks.parameters.code || '') : '';
['eeat_prompt_injection','style_prompt_injection','system_prompt_injection','structure_prompt_injection',
 'brief_enforcer_injection','faq_injection','brief_authority_preamble','secondary_keyword_checklist'].forEach(f => {
    if (ksCode.includes(f)) pass('Keyword Strategist builds: ' + f);
    else fail('Keyword Strategist MISSING: ' + f);
});

// ─────────────────────────────────────────────────────────────────
// SECTION 6: SCHEMA CHECKS
// ─────────────────────────────────────────────────────────────────
console.log('\n── SECTION 6: OUTPUT PARSER SCHEMAS ───────────────────────');

const ceParser = legit.nodes.find(n => n.name === 'Claims Extractor Output Parser');
if (ceParser && ceParser.parameters && ceParser.parameters.jsonSchemaExample) {
    const schema = ceParser.parameters.jsonSchemaExample;
    if (schema.includes('placement_manifest') && schema.includes('section') && schema.includes('placement_instruction'))
        pass('Claims Extractor Output Parser: placement-aware schema');
    else fail('Claims Extractor Output Parser: schema missing placement fields');
} else fail('Claims Extractor Output Parser: no schema found');

const vcParser = legit.nodes.find(n => n.name === 'Verified Claims Output Parser');
if (vcParser && vcParser.parameters && vcParser.parameters.jsonSchemaExample) {
    const schema = vcParser.parameters.jsonSchemaExample;
    if (schema.includes('verified_placement_manifest') && schema.includes('section'))
        pass('Verified Claims Output Parser: verified placement schema');
    else fail('Verified Claims Output Parser: schema missing placement fields');
} else fail('Verified Claims Output Parser: no schema found');

// ─────────────────────────────────────────────────────────────────
// SECTION 7: ANTI-HALLUCINATION RULES IN FACT CHECKERS
// ─────────────────────────────────────────────────────────────────
console.log('\n── SECTION 7: FACT CHECKER INTEGRITY ──────────────────────');
const preFC = legit.nodes.find(n => n.name === 'Pre-Draft Fact Checker');
const postFC = legit.nodes.find(n => n.name === 'Post-Draft Fact Checker');
const preFCText = getNodeText(preFC);
const postFCText = getNodeText(postFC);

if (preFCText.length > 100) pass('Pre-Draft Fact Checker has prompt content');
else fail('Pre-Draft Fact Checker: empty or missing prompt');

if (postFCText.length > 100) pass('Post-Draft Fact Checker has prompt content');
else fail('Post-Draft Fact Checker: empty or missing prompt');

// ─────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('  QA RESULTS SUMMARY');
console.log('══════════════════════════════════════════════════════════');
console.log('\nPASSES:', passes.length);
passes.forEach(p => console.log('  ' + p));
console.log('\nISSUES/WARNINGS:', issues.length);
issues.forEach(i => console.log('  ' + i));
console.log('\nFinal Score:', passes.length + '/' + (passes.length + issues.length));
