/**
 * PROFESSIONAL WORKFLOW LAYOUT
 *
 * Design approach:
 * - Left-to-right flow with clear stage columns
 * - Swim-lane rows: Main Pipeline (top), Sub-models/parsers (below each parent)
 * - Generous horizontal spacing (900px between stages) — readable without zoom
 * - Sticky note headers for each stage group
 * - Error handling lane at the bottom, isolated from main flow
 * - All positions in n8n canvas units (approx 1 unit = 1px at 100% zoom)
 *
 * LAYOUT MAP (column x values, all rows at y offsets):
 *
 *  COL 0    COL 1    COL 2    COL 3    COL 4    COL 5    COL 6    COL 7    COL 8    COL 9    COL 10   COL 11
 *  TRIGGER  PARSE    RESEARCH CLAIMS   DRAFT    BOUNCE   RESCH    EDIT-1   EDIT-2   EDIT-3   AUDIT    EXPORT
 *  x=0      x=900    x=1800   x=2700   x=3600   x=4500   x=5400   x=6300   x=7200   x=8100   x=9000   x=9900
 *
 * ROW STRUCTURE (y values):
 *  y = -400  : Sticky note headers
 *  y = 0     : Main pipeline nodes (primary chain)
 *  y = 380   : Sub-models and output parsers (attached to parent)
 *  y = 700   : Secondary research track (Client Site, Client Profile)
 *  y = 1200  : Error handling lane (isolated)
 */

const fs = require('fs');
const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
fs.copyFileSync('DEV Skywide Content (Word Count Fix).json', `DEV Skywide Content (Word Count Fix) PRE-LAYOUT-${ts}.json`);
console.log('✅ Backup created\n');

const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN DEFINITIONS (x positions)
// ─────────────────────────────────────────────────────────────────────────────
const COL = {
    TRIGGER:    200,
    PARSE:      1100,
    RESEARCH:   2100,    // Pre-Draft FC, Client Site Researcher track
    CLAIMS:     3100,    // Claims Extractor, Verified Claims Parser
    DRAFT:      4100,    // Claude Draft
    BOUNCE:     5000,    // QSI Bouncer
    DATACHECK:  5900,    // Data Check (research gap), Post-Draft FC
    EDIT1:      6800,    // Claude Keyword Check + Apply Recommendations
    EDIT2:      7700,    // Claude EEAT + NLP/PR
    EDIT3:      8600,    // Humanised Readability + Final SEO Snippet
    SEO_OPT:    9500,    // OpenAI SEO Optimization
    AUDIT:      10400,   // Structure Auditor pass 1 & 2
    EXPORT:     11400,   // Document Export Sanitization, Create/Update Doc
    DONE:       12300,   // Signal Completion
};

// ROW DEFINITIONS (y positions)
const ROW = {
    LABEL:      -440,    // Sticky note stage headers
    MAIN:       0,       // Primary pipeline nodes
    SUB:        380,     // Sub-models and output parsers
    LOWER:      680,     // Client research track, secondary nodes
    ERROR:      1300,    // Error handling — fully isolated
};

// ─────────────────────────────────────────────────────────────────────────────
// NODE POSITION MAP
// ─────────────────────────────────────────────────────────────────────────────
const positions = {
    // ── STAGE 0: TRIGGER & STARTUP ──────────────────────────────────────────
    'Webhook1':                             [COL.TRIGGER,  ROW.MAIN],
    'Startup Update':                       [COL.TRIGGER,  ROW.LOWER],
    'If Revision':                          [COL.TRIGGER + 350, ROW.MAIN],

    // ── STAGE 1: BRIEF PARSING ───────────────────────────────────────────────
    'Parse Creative Brief (LLM)':           [COL.PARSE,    ROW.MAIN],
    'Keyword Strategist':                   [COL.PARSE,    ROW.LOWER],
    'Keyword Validator':                    [COL.PARSE + 400, ROW.LOWER],

    // ── STAGE 2: RESEARCH ────────────────────────────────────────────────────
    'Pre-Draft Fact Checker':               [COL.RESEARCH, ROW.MAIN],
    'Client Site Researcher':               [COL.RESEARCH, ROW.LOWER],
    'Client Profile Extractor':             [COL.RESEARCH + 500, ROW.LOWER],

    // ── STAGE 3: CLAIMS MANIFEST ─────────────────────────────────────────────
    'Claims Extractor & Manifest Generator':[COL.CLAIMS,   ROW.MAIN],
    'Claims Extractor Output Parser':       [COL.CLAIMS,   ROW.SUB],
    'Claims Extractor Model':               [COL.CLAIMS + 300, ROW.SUB],
    'Verified Claims Parser':               [COL.CLAIMS + 600, ROW.MAIN],
    'Verified Claims Output Parser':        [COL.CLAIMS + 600, ROW.SUB],
    'Verified Parser Model':                [COL.CLAIMS + 900, ROW.SUB],

    // ── STAGE 4: DRAFT ───────────────────────────────────────────────────────
    'Claude Draft (Claude Opus 3)1':        [COL.DRAFT,    ROW.MAIN],

    // ── STAGE 5: QSI BOUNCER ─────────────────────────────────────────────────
    'QSI Claims Verification Bouncer':      [COL.BOUNCE,   ROW.MAIN],
    'QSI Bouncer Model':                    [COL.BOUNCE,   ROW.SUB],

    // ── STAGE 6: RESEARCH GAP CHECK ──────────────────────────────────────────
    'Data Check & Research Gaps1':          [COL.DATACHECK,ROW.MAIN],
    'Post-Draft Fact Checker':              [COL.DATACHECK,ROW.LOWER],

    // ── STAGE 7: EDITING CHAIN ───────────────────────────────────────────────
    'Claude Keyword Check + Semantic Gap1': [COL.EDIT1,    ROW.MAIN],
    'Claude Apply Recommendations1':        [COL.EDIT1 + 450, ROW.MAIN],
    'Claude EEAT Injection1':               [COL.EDIT2,    ROW.MAIN],
    'Claude NLP & PR Optimization':         [COL.EDIT2 + 500, ROW.MAIN],
    'Claude Humanised Readability Rewrite': [COL.EDIT3,    ROW.MAIN],
    'Claude Final SEO Snippet Optimization':[COL.EDIT3 + 500, ROW.MAIN],
    'Surgical Rewriter':                    [COL.EDIT3 + 500, ROW.LOWER],

    // ── STAGE 8: SEO OPTIMIZATION ────────────────────────────────────────────
    'OpenAI SEO Optimization1':             [COL.SEO_OPT,  ROW.MAIN],

    // ── STAGE 9: STRUCTURE AUDIT ─────────────────────────────────────────────
    'Structure Auditor (Pass 1)':           [COL.AUDIT,    ROW.MAIN],
    'Structure Audit Gate':                 [COL.AUDIT + 450, ROW.MAIN],
    'Structure Auditor (Pass 2)':           [COL.AUDIT + 900, ROW.MAIN],
    'Structure Audit Gate 2':               [COL.AUDIT + 1350, ROW.MAIN],
    'Flag For Human Review':                [COL.AUDIT + 1600, ROW.LOWER],

    // Structured output parsers (grouped with their parents)
    'Structured Output Parser':             [COL.CLAIMS,   ROW.LOWER + 200],
    'Structured Output Parser1':            [COL.CLAIMS + 600, ROW.LOWER + 200],
    'Structured Output Parser2':            [COL.AUDIT + 450, ROW.SUB],
    'Structured Output Parser3':            [COL.AUDIT + 1350, ROW.SUB],

    // ── STAGE 10: EXPORT ─────────────────────────────────────────────────────
    'Document Export Sanitization5':        [COL.EXPORT,   ROW.MAIN],
    'Create a document17':                  [COL.EXPORT + 500, ROW.MAIN],
    'Create folder1':                       [COL.EXPORT + 500, ROW.LOWER],
    'Google Drive Notification1':           [COL.EXPORT + 900, ROW.LOWER],
    'Update a document17':                  [COL.EXPORT + 900, ROW.MAIN],
    'Signal Completion (Update a document17)': [COL.DONE, ROW.MAIN],

    // ── ERROR LANE (isolated at bottom) ─────────────────────────────────────
    'Error Trigger':                        [COL.TRIGGER,  ROW.ERROR],
    'Send Error to Dashboard':              [COL.TRIGGER + 500, ROW.ERROR],
};

// ─────────────────────────────────────────────────────────────────────────────
// APPLY POSITIONS
// ─────────────────────────────────────────────────────────────────────────────
let moved = 0;
for (const node of wf.nodes) {
    if (positions[node.name]) {
        node.position = positions[node.name];
        moved++;
    }
}
console.log(`Positioned ${moved}/${wf.nodes.length} nodes`);

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE OLD STICKY NOTES
// ─────────────────────────────────────────────────────────────────────────────
const beforeCount = wf.nodes.length;
wf.nodes = wf.nodes.filter(n => !n.type.includes('stickyNote'));
const removed = beforeCount - wf.nodes.length;
console.log(`Removed ${removed} old sticky notes`);

// ─────────────────────────────────────────────────────────────────────────────
// ADD PROFESSIONAL STICKY NOTE LABELS
// ─────────────────────────────────────────────────────────────────────────────
// n8n sticky note colors: 0=yellow, 1=red, 2=blue, 3=green, 4=purple, 5=black/dark
const COLORS = { yellow: 0, red: 1, blue: 2, green: 3, purple: 4, dark: 5 };

function makeSticky(id, content, x, y, width, height, color = COLORS.blue) {
    return {
        id: `sticky_${id}`,
        name: `Note_${id}`,
        type: 'n8n-nodes-base.stickyNote',
        typeVersion: 1,
        position: [x, y],
        parameters: { width, height, color, content },
    };
}

const stickies = [
    // ── STAGE HEADERS ─────────────────────────────────────────────────────────
    makeSticky('trigger', '## 🚀 Stage 0\n**Trigger & Startup**\nWebhook receives the content request.\nRevision check routes to the correct path.', COL.TRIGGER - 20, ROW.LABEL, 740, 200, COLORS.dark),
    makeSticky('parse', '## 📋 Stage 1\n**Brief Parsing**\nLLM parses the creative brief.\nKeyword Strategist builds all SEO injections.', COL.PARSE - 20, ROW.LABEL, 820, 200, COLORS.purple),
    makeSticky('research', '## 🔍 Stage 2\n**Pre-Draft Research**\nFact-checker audits brief claims.\nClient site scraped for verified data.', COL.RESEARCH - 20, ROW.LABEL, 1080, 200, COLORS.blue),
    makeSticky('claims', '## 📌 Stage 3\n**Claims Manifest**\nClaims extracted & placed per section.\nFact-check cross-referenced → verified manifest.', COL.CLAIMS - 20, ROW.LABEL, 1600, 200, COLORS.green),
    makeSticky('draft', '## ✍️ Stage 4\n**Claude Draft**\nFirst draft written with verified claims,\nclient ground truth, and anti-hallucination protocol.', COL.DRAFT - 20, ROW.LABEL, 820, 200, COLORS.purple),
    makeSticky('bounce', '## 🚦 Stage 5\n**QSI Bouncer**\nFabrication scan + claims audit.\nCleaned article proceeds to research gap check.', COL.BOUNCE - 20, ROW.LABEL, 820, 200, COLORS.red),
    makeSticky('datacheck', '## 🧪 Stage 6\n**Research Gap Check**\nPerplexity finds gaps & corrections.\nPost-draft fact-check produces verdict report.', COL.DATACHECK - 20, ROW.LABEL, 820, 200, COLORS.blue),
    makeSticky('edit', '## ✂️ Stage 7\n**Editorial Chain** (6 passes)\nKeyword → Recommendations → EEAT → NLP/PR\n→ Humanised → Final SEO Snippet', COL.EDIT1 - 20, ROW.LABEL, 1870, 200, COLORS.green),
    makeSticky('seoopt', '## 🎯 Stage 8\n**SEO Optimization**\nOpenAI optimizes for featured snippets,\nvoice search, and People Also Ask.', COL.SEO_OPT - 20, ROW.LABEL, 820, 200, COLORS.purple),
    makeSticky('audit', '## 🏗️ Stage 9\n**Structure Audit**\nTwo-pass structural integrity check.\nSurgical rewriter fixes issues. Human flag if needed.', COL.AUDIT - 20, ROW.LABEL, 1900, 200, COLORS.yellow),
    makeSticky('export', '## 📤 Stage 10\n**Export & Delivery**\nSanitized → Google Doc created → Updated.\nDrive notification + completion signal fired.', COL.EXPORT - 20, ROW.LABEL, 1480, 200, COLORS.green),

    // ── ERROR LANE HEADER ──────────────────────────────────────────────────────
    makeSticky('error', '## ⚠️ Error Handling\nCaught errors routed to dashboard.\nMain pipeline is not interrupted.', COL.TRIGGER - 20, ROW.ERROR - 160, 900, 130, COLORS.red),

    // ── SUB-MODEL LANE LABEL ──────────────────────────────────────────────────
    makeSticky('submodels', '_Sub-models & Output Parsers_\n(attached to parent nodes above)', COL.CLAIMS - 20, ROW.SUB - 50, 1600, 60, COLORS.dark),
];

wf.nodes.push(...stickies);
console.log(`Added ${stickies.length} professional sticky note labels`);

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY & SAVE
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync('DEV Skywide Content (Word Count Fix).json', JSON.stringify(wf, null, 2));

const verify = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
const positionedCount = verify.nodes.filter(n => positions[n.name]).length;
const unpositioned = verify.nodes.filter(n => !positions[n.name] && !n.type.includes('stickyNote'));

console.log('\n═══════════════════════════════════════════');
console.log('LAYOUT VERIFICATION');
console.log('═══════════════════════════════════════════');
console.log('Total nodes:', verify.nodes.length);
console.log('Positioned:', positionedCount);
console.log('Sticky notes added:', verify.nodes.filter(n => n.type.includes('stickyNote')).length);
if (unpositioned.length) {
    console.log('\n⚠️  Unpositioned nodes (left at original position):');
    unpositioned.forEach(n => console.log('   -', n.name));
} else {
    console.log('\n✅ All pipeline nodes positioned');
}
