/**
 * HARDENED MIGRATION SCRIPT
 * Senior Architect Level — Safe, Audited, Reversible
 * 
 * Takes today's improvements from DEV_Skywide_Content_QA_Pipeline_Fixed.json
 * and merges them into the legit DEV Skywide Content (Word Count Fix).json
 * 
 * Changes applied:
 * 1. Transplant 8 new Claims/Bouncer nodes (with positions adjusted)
 * 2. Fix If Revision branch - wire false branch to Client Site Researcher
 * 3. Wire Claims Extractor output into Claude Draft (placement-aware manifest)
 * 4. Add 3 editorial rules to Claude Draft, QSI Bouncer, and all downstream editors
 * 5. Build 4 missing Keyword Strategist injection fields
 * 6. Add Meta Title + Meta Description enforcement to Claude Draft and QSI Bouncer
 * 7. Fix Verified Claims Parser prompt reference
 */

const fs = require('fs');

// --- BACKUP FIRST ---
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const backupPath = 'DEV Skywide Content (Word Count Fix) BACKUP ' + timestamp + '.json';
fs.copyFileSync('DEV Skywide Content (Word Count Fix).json', backupPath);
console.log('✅ Backup created:', backupPath);

// Load both files
const legit = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
const fixed = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

const changes = [];

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 1: Transplant the 8 new Claims/Bouncer nodes into the legit file
// ─────────────────────────────────────────────────────────────────────────────
const newNodeNames = [
    'Claims Extractor Model',
    'Claims Extractor & Manifest Generator',
    'QSI Bouncer Model',
    'QSI Claims Verification Bouncer',
    'Verified Parser Model',
    'Verified Claims Parser',
    'Verified Claims Output Parser',
    'Claims Extractor Output Parser'
];

const legitNodeNames = new Set(legit.nodes.map(n => n.name));

// Find a reference position in legit — anchor near Claude Draft
const claudeDraftNode = legit.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
const anchorX = claudeDraftNode ? claudeDraftNode.position[0] : 700000;
const anchorY = claudeDraftNode ? claudeDraftNode.position[1] : 186000;

// Find corresponding positions from fixed file and offset them
const fixedBouncerNode = fixed.nodes.find(n => n.name === 'QSI Claims Verification Bouncer');
const fixedAnchorX = fixedBouncerNode ? fixedBouncerNode.position[0] : 713000;
const fixedAnchorY = fixedBouncerNode ? fixedBouncerNode.position[1] : 186000;
const offsetX = anchorX - fixedAnchorX + 5000;
const offsetY = anchorY - fixedAnchorY;

newNodeNames.forEach(name => {
    if (legitNodeNames.has(name)) {
        console.log('⏩ SKIP (already exists):', name);
        return;
    }
    const node = fixed.nodes.find(n => n.name === name);
    if (!node) {
        console.log('⚠️  NOT FOUND in fixed file:', name);
        return;
    }
    // Adjust position to fit in legit canvas
    const newNode = JSON.parse(JSON.stringify(node));
    newNode.position = [
        node.position[0] + offsetX,
        node.position[1] + offsetY
    ];
    legit.nodes.push(newNode);
    changes.push('ADDED node: ' + name);
    console.log('✅ ADDED node:', name, 'at position', newNode.position);
});

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 2: Transplant connections for the new nodes
// ─────────────────────────────────────────────────────────────────────────────
const fixedConnSources = [
    'Claims Extractor & Manifest Generator',
    'QSI Claims Verification Bouncer',
    'Verified Claims Parser',
    'Client Profile Extractor', // needs new connection to Claims Extractor
];

fixedConnSources.forEach(src => {
    if (fixed.connections[src]) {
        if (!legit.connections[src]) {
            legit.connections[src] = fixed.connections[src];
            changes.push('ADDED connections for: ' + src);
            console.log('✅ ADDED connections for:', src);
        } else {
            console.log('⏩ SKIP connections (already exists):', src);
        }
    }
});

// Also wire QSI Bouncer sub-nodes (model + parser) to parent chain
// These are wired via ai_languageModel and ai_outputParser ports
// Already handled since we copied the connections from fixed file

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 3: Wire QSI Bouncer into the legit pipeline
// Insert: Claude Draft → QSI Bouncer → Data Check & Research Gaps1
// (replacing direct Claude Draft → Data Check connection)
// ─────────────────────────────────────────────────────────────────────────────

// Check if Claude Draft already connects to QSI Bouncer in legit
const claudeDraftConns = legit.connections['Claude Draft (Claude Opus 3)1'];
const alreadyHasBouncer = claudeDraftConns && 
    claudeDraftConns.main && 
    claudeDraftConns.main[0] && 
    claudeDraftConns.main[0].some(c => c.node === 'QSI Claims Verification Bouncer');

if (!alreadyHasBouncer) {
    // Find what Claude Draft currently connects to
    const currentTarget = claudeDraftConns && claudeDraftConns.main && claudeDraftConns.main[0] && claudeDraftConns.main[0][0];
    console.log('Claude Draft currently connects to:', currentTarget ? currentTarget.node : 'nothing');
    
    // Wire: Claude Draft → QSI Bouncer
    if (!legit.connections['Claude Draft (Claude Opus 3)1']) {
        legit.connections['Claude Draft (Claude Opus 3)1'] = { main: [[]] };
    }
    // Keep existing connections but add QSI Bouncer
    // Actually: replace first main output to go to QSI Bouncer instead
    const existingMainConns = legit.connections['Claude Draft (Claude Opus 3)1'].main || [[]];
    // Save original target for QSI Bouncer to connect to
    const originalTarget = existingMainConns[0] && existingMainConns[0][0] ? existingMainConns[0][0] : null;
    
    // Claude Draft → QSI Bouncer
    legit.connections['Claude Draft (Claude Opus 3)1'].main = [[{ node: 'QSI Claims Verification Bouncer', type: 'main', index: 0 }]];
    changes.push('REWIRED: Claude Draft → QSI Claims Verification Bouncer');
    console.log('✅ REWIRED: Claude Draft → QSI Claims Verification Bouncer');
    
    // QSI Bouncer → original target (Data Check & Research Gaps1)
    if (!legit.connections['QSI Claims Verification Bouncer']) {
        legit.connections['QSI Claims Verification Bouncer'] = { main: [[]] };
    }
    if (originalTarget) {
        legit.connections['QSI Claims Verification Bouncer'].main = [[{ node: originalTarget.node, type: 'main', index: 0 }]];
        changes.push('WIRED: QSI Bouncer → ' + originalTarget.node);
        console.log('✅ WIRED: QSI Bouncer →', originalTarget.node);
    }
} else {
    console.log('⏩ SKIP: QSI Bouncer already wired from Claude Draft');
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 4: Fix If Revision false branch (currently dead-end for fresh articles)
// Wire: If Revision (false) → Client Site Researcher
// ─────────────────────────────────────────────────────────────────────────────
const ifRevisionConns = legit.connections['If Revision'];
if (ifRevisionConns && ifRevisionConns.main) {
    const falseBranch = ifRevisionConns.main[1]; // index 1 = false branch
    if (!falseBranch || falseBranch.length === 0) {
        if (!legit.connections['If Revision'].main[1]) {
            legit.connections['If Revision'].main[1] = [];
        }
        legit.connections['If Revision'].main[1] = [{ node: 'Client Site Researcher', type: 'main', index: 0 }];
        changes.push('FIXED: If Revision false branch → Client Site Researcher (was dead-end)');
        console.log('✅ FIXED: If Revision false branch now routes to Client Site Researcher');
    } else {
        console.log('⏩ SKIP: If Revision false branch already connected');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 5: Wire Claims Extractor into the pipeline after Client Profile Extractor
// Client Profile Extractor → Claims Extractor & Manifest Generator → Verified Claims Parser
// ─────────────────────────────────────────────────────────────────────────────
const clientProfileConns = legit.connections['Client Profile Extractor'];
const profileAlreadyHasClaims = clientProfileConns && clientProfileConns.main && 
    clientProfileConns.main[0] && 
    clientProfileConns.main[0].some(c => c.node === 'Claims Extractor & Manifest Generator');

if (!profileAlreadyHasClaims) {
    if (!legit.connections['Client Profile Extractor']) {
        legit.connections['Client Profile Extractor'] = { main: [[]] };
    }
    legit.connections['Client Profile Extractor'].main = [[{ node: 'Claims Extractor & Manifest Generator', type: 'main', index: 0 }]];
    changes.push('WIRED: Client Profile Extractor → Claims Extractor & Manifest Generator');
    console.log('✅ WIRED: Client Profile Extractor → Claims Extractor & Manifest Generator');
}

// Claims Extractor → Verified Claims Parser (already in connections from fixed file, but verify)
if (!legit.connections['Claims Extractor & Manifest Generator']) {
    legit.connections['Claims Extractor & Manifest Generator'] = {
        main: [[{ node: 'Verified Claims Parser', type: 'main', index: 0 }]]
    };
    changes.push('WIRED: Claims Extractor → Verified Claims Parser');
    console.log('✅ WIRED: Claims Extractor → Verified Claims Parser');
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 6: Update Claude Draft prompt — inject placement manifest + editorial rules
// ─────────────────────────────────────────────────────────────────────────────
const EDITORIAL_RULES = `
# ═══ EDITORIAL RULES (NON-NEGOTIABLE — ENFORCED ON EVERY ARTICLE) ═══

## RULE 1 — Client Name Placement
The client name ({{ $('Webhook1').first().json.body.client_name }}) MUST appear in the CLOSING/CONCLUSION paragraph.
Do NOT mention the client in the opening paragraph or introduction.
The introduction must draw readers in with the topic — the client is introduced at the end as the solution.

## RULE 2 — Brand Voice
Write primarily from the client's perspective using first-person language: "we," "our," "us" for {{ $('Webhook1').first().json.body.client_name }}.
Second-person ("you") can be used selectively when addressing the reader.
Do NOT write in neutral third-party commentary about the client (e.g., "XYZ Company offers..." → wrong. "We offer..." → correct).

## RULE 3 — Tone & Phrasing (MANDATORY RESTRICTIONS)
- Do NOT use em-dashes (—). Use commas, periods, or parentheses instead.
- Avoid: "journey", "navigate", "navigating", "seamless", "seamlessly"
- Avoid: "in the ever-changing landscape of", "in the ever-evolving terrain of"
- Restrict: "comprehensive", "integrate", "integrated" — use sparingly or not at all
- Avoid correlative constructions: "not only … but also", "not just … but also"
- No fabricated clinical quotes: never write "our patients report…", "we have seen…", "practitioners consistently see…"
- Keep sentences concise. Keep paragraphs short (3-4 sentences max).
- Writing must feel like trusted advice from a knowledgeable professional — not corporate copy.

## RULE 4 — Meta Title & Meta Description (MANDATORY STRUCTURE)
Every article MUST begin with these two lines before the H1 heading:
Meta Title: [SEO-optimised title, max 60 characters, includes primary keyword]
Meta Description: [Compelling description, 140-160 characters, includes primary keyword]

## RULE 5 — Claims & Statistics (ANTI-HALLUCINATION)
Only use statistics and facts from the VERIFIED CLAIMS MANIFEST below.
Do NOT invent percentages, multipliers, or precision figures.
If no verified stats exist, write qualitatively without numbers.

# ═══════════════════════════════════════════════════════

# ═══ MANDATORY CLAIMS & PLACEMENT MANIFEST ═══
The following claims have been verified against the client's live website and fact-checked.
Each claim includes the EXACT section it must be placed in. Place every claim in its specified section — no omissions.

{{ JSON.stringify($('Claims Extractor & Manifest Generator').first().json.output ? $('Claims Extractor & Manifest Generator').first().json.output.placement_manifest : []) }}

ENFORCEMENT: Before finalising the article, scan each H2 section and confirm every manifest item for that section has been included.
# ════════════════════════════════════════════════
`;

for (const node of legit.nodes) {
    if (node.name === 'Claude Draft (Claude Opus 3)1') {
        if (node.parameters && node.parameters.messages && node.parameters.messages.messageValues) {
            let msg = node.parameters.messages.messageValues[0].message;
            
            // Only inject if not already present
            if (!msg.includes('EDITORIAL RULES (NON-NEGOTIABLE')) {
                // Inject before the Anti-Hallucination block or at the start of the user message
                if (msg.includes('ANTI-HALLUCINATION PROTOCOL')) {
                    msg = msg.replace('# ⛔ ANTI-HALLUCINATION PROTOCOL', EDITORIAL_RULES + '\n# ⛔ ANTI-HALLUCINATION PROTOCOL');
                } else {
                    msg = EDITORIAL_RULES + '\n\n' + msg;
                }
                node.parameters.messages.messageValues[0].message = msg;
                changes.push('UPDATED Claude Draft: injected editorial rules + claims manifest');
                console.log('✅ UPDATED Claude Draft with editorial rules + placement manifest');
            } else {
                console.log('⏩ SKIP: Claude Draft already has editorial rules');
            }
        }
        break;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 7: Update QSI Bouncer prompt — add editorial rules enforcement
// ─────────────────────────────────────────────────────────────────────────────
const BOUNCER_RULES = `
# ═══ EDITORIAL RULES — FINAL ENFORCEMENT ═══
Before finalising the article, verify ALL of the following:

1. ✅ Client name appears ONLY in the closing/conclusion paragraph — NOT in the opening
2. ✅ Article is written in first-person brand voice (we/our) for the client where appropriate
3. ✅ Zero em-dashes (—) — replace any found with commas or periods
4. ✅ None of these words present: seamless, seamlessly, journey, navigate, navigating
5. ✅ Article begins with "Meta Title:" and "Meta Description:" before the H1
6. ✅ Every claim in the manifest below has been placed in its correct section
7. ✅ No fabricated statistics, clinical quotes, or invented percentages

VERIFIED CLAIMS MANIFEST (every item must appear in the article in its specified section):
{{ JSON.stringify($('Claims Extractor & Manifest Generator').first().json.output ? $('Claims Extractor & Manifest Generator').first().json.output.placement_manifest : []) }}
# ════════════════════════════════════════════════

`;

for (const node of legit.nodes) {
    if (node.name === 'QSI Claims Verification Bouncer') {
        if (node.parameters && node.parameters.text) {
            if (!node.parameters.text.includes('EDITORIAL RULES — FINAL ENFORCEMENT')) {
                node.parameters.text = BOUNCER_RULES + node.parameters.text;
                changes.push('UPDATED QSI Bouncer: injected editorial rules enforcement');
                console.log('✅ UPDATED QSI Bouncer with editorial rules enforcement');
            } else {
                console.log('⏩ SKIP: QSI Bouncer already has editorial rules');
            }
        }
        break;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 8: Add em-dash ban + Meta Title enforcement to all downstream editors
// ─────────────────────────────────────────────────────────────────────────────
const DOWNSTREAM_RULES_SUFFIX = `

# ═══ MANDATORY EDITORIAL CHECKS ═══
Before outputting the article, verify:
- Zero em-dashes (—) in the entire text. Replace with commas or periods.
- "Meta Title:" and "Meta Description:" lines are present at the very start of the article (before the H1).
- Client name appears only in the closing paragraph, not in the opening.
- No instances of: seamless, seamlessly, journey, navigate, navigating, comprehensive (unless absolutely necessary).
- No fabricated statistics or invented percentages.
# ════════════════════════════════════════════
`;

const downstreamEditors = [
    'Claude Keyword Check + Semantic Gap1',
    'Claude Apply Recommendations1',
    'Claude EEAT Injection1',
    'Claude NLP & PR Optimization',
    'Claude Humanised Readability Rewrite',
    'Claude Final SEO Snippet Optimization',
    'Data Check & Research Gaps1'
];

for (const node of legit.nodes) {
    if (downstreamEditors.includes(node.name)) {
        let textProp = null;
        if (node.parameters && node.parameters.text) textProp = 'text';
        else if (node.parameters && node.parameters.messages && node.parameters.messages.message) textProp = 'messages';

        if (textProp === 'text') {
            if (!node.parameters.text.includes('MANDATORY EDITORIAL CHECKS')) {
                node.parameters.text += DOWNSTREAM_RULES_SUFFIX;
                changes.push('UPDATED ' + node.name + ': added editorial checks footer');
                console.log('✅ UPDATED', node.name, '- editorial checks footer added');
            } else {
                console.log('⏩ SKIP:', node.name, '(already has editorial checks)');
            }
        } else if (textProp === 'messages') {
            const msgArr = node.parameters.messages.message;
            if (Array.isArray(msgArr)) {
                const lastMsg = msgArr[msgArr.length - 1];
                if (lastMsg && lastMsg.content && !lastMsg.content.includes('MANDATORY EDITORIAL CHECKS')) {
                    lastMsg.content += DOWNSTREAM_RULES_SUFFIX;
                    changes.push('UPDATED ' + node.name + ': added editorial checks footer');
                    console.log('✅ UPDATED', node.name, '- editorial checks footer added');
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 9: Fix Keyword Strategist — build the 4 missing injection fields
// ─────────────────────────────────────────────────────────────────────────────
const MISSING_INJECTIONS = `

// ─── EEAT INJECTION ───────────────────────────────────────────────────────────
const eeatPromptInjection = \`### E-E-A-T SIGNALS (Experience, Expertise, Authoritativeness, Trustworthiness)

Write with demonstrable expertise. Signal experience through specificity — real scenarios, precise details, concrete outcomes.
For medical/legal/financial topics: only cite named primary sources (PubMed, official .gov/.org, peer-reviewed journals).
Never use vague authority phrases like "experts say", "studies show", "research reveals" without a named source + URL.
Fabricated physician quotes or fake clinical statistics are grounds for immediate rejection.\`;

// ─── STYLE INJECTION ─────────────────────────────────────────────────────────
const stylePromptInjection = \`### STYLE ENFORCEMENT (MANDATORY)

- Do NOT use em-dashes (—). Replace with commas, periods, or parentheses.
- Avoid: "journey", "navigate", "navigating", "seamless", "seamlessly"
- Avoid: "in the ever-changing landscape of", "in the ever-evolving terrain of"
- Restrict: "comprehensive", "integrate", "integrated"
- Avoid correlative constructions: "not only … but also", "not just … but also"
- Keep sentences concise. Keep paragraphs to 3-4 sentences maximum.
- Writing must feel like trusted professional advice, not marketing copy.\`;

// ─── SYSTEM INJECTION ────────────────────────────────────────────────────────
const systemPromptInjection = \`### GLOBAL RULES (NON-NEGOTIABLE)

1. Client name appears ONLY in the closing paragraph — never in the opening.
2. Write in first-person brand voice (we/our) for the client.
3. Every article must start with Meta Title: and Meta Description: before the H1.
4. No fabricated statistics, hallucinated studies, or invented clinical data.
5. No em-dashes, no journey/navigate/seamless language.
6. Word count must be within 10% of the target.\`;

// ─── STRUCTURE INJECTION ─────────────────────────────────────────────────────
const structurePromptInjection = \`### STRUCTURAL REQUIREMENTS

- Article must begin with: Meta Title: [max 60 chars] and Meta Description: [140-160 chars]
- H1 must contain the primary keyword
- Minimum one H2 must contain the primary keyword or a close variation
- Primary keyword must appear in the first 100 words (after Meta Title/Description)
- Primary keyword must appear in the conclusion
- All FAQ questions must use H3 tags (### in markdown)
- Never skip heading levels (H1 → H2 → H3 only)\`;

`;

const MISSING_RETURN_FIELDS = `    eeat_prompt_injection:      eeatPromptInjection,
    style_prompt_injection:     stylePromptInjection,
    system_prompt_injection:    systemPromptInjection,
    structure_prompt_injection: structurePromptInjection,`;

for (const node of legit.nodes) {
    if (node.name === 'Keyword Strategist') {
        let code = node.parameters.jsCode || node.parameters.code || '';
        
        if (!code.includes('eeat_prompt_injection')) {
            // Inject the new fields before the return statement
            code = code.replace('return {', MISSING_INJECTIONS + '\nreturn {');
            
            // Add to the json return object
            code = code.replace(
                'secondary_keyword_checklist:    secondaryKeywordChecklist,',
                'secondary_keyword_checklist:    secondaryKeywordChecklist,\n' + MISSING_RETURN_FIELDS
            );
            
            if (node.parameters.jsCode) node.parameters.jsCode = code;
            else node.parameters.code = code;
            
            changes.push('UPDATED Keyword Strategist: built 4 missing injection fields (eeat, style, system, structure)');
            console.log('✅ UPDATED Keyword Strategist: 4 missing injection fields now built');
        } else {
            console.log('⏩ SKIP: Keyword Strategist already builds all injection fields');
        }
        break;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 10: Fix Verified Claims Parser prompt to reference Pre-Draft Fact Checker correctly
// ─────────────────────────────────────────────────────────────────────────────
for (const node of legit.nodes) {
    if (node.name === 'Verified Claims Parser') {
        if (node.parameters && node.parameters.text) {
            const newPrompt = `=# Verified Claims Parser

You will receive a Fact-Check Report and the original Claims Placement Manifest.

Your ONLY job is to cross-reference the two and output a clean verified manifest where:
- Claims confirmed as VERIFIED retain their section placement and get their source URL added
- Claims flagged as UNVERIFIABLE or REMOVE are dropped entirely
- Each verified claim keeps its target section so the writer knows exactly where to place it

## Inputs
**Fact-Check Report:**
{{ $('Pre-Draft Fact Checker').first().json.choices[0].message.content || $('Pre-Draft Fact Checker').first().json.text || 'No fact-check report available.' }}

**Original Placement Manifest:**
{{ JSON.stringify($('Claims Extractor & Manifest Generator').first().json.output ? $('Claims Extractor & Manifest Generator').first().json.output.placement_manifest : []) }}

Output STRICTLY in the provided JSON schema. Return ONLY raw valid JSON. No markdown code blocks. No conversational text.`;

            if (node.parameters.text !== newPrompt) {
                node.parameters.text = newPrompt;
                changes.push('UPDATED Verified Claims Parser: fixed prompt references to use correct node outputs');
                console.log('✅ UPDATED Verified Claims Parser: prompt references corrected');
            }
        }
        break;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE OUTPUT
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync('DEV Skywide Content (Word Count Fix).json', JSON.stringify(legit, null, 2));

console.log('\n═══════════════════════════════════════════════════════');
console.log('MIGRATION COMPLETE');
console.log('═══════════════════════════════════════════════════════');
console.log('Total changes applied:', changes.length);
changes.forEach((c, i) => console.log((i + 1) + '. ' + c));
console.log('\nBackup saved as:', backupPath);
console.log('Updated file: DEV Skywide Content (Word Count Fix).json');
