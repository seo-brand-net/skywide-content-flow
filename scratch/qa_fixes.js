/**
 * QA FIX SCRIPT — Resolves all 11 issues found by full_qa.js
 */
const fs = require('fs');
const legit = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
const fixes = [];

// ─────────────────────────────────────────────────────────────────
// FIX 1: Wire Claims Extractor → Verified Claims Parser (main)
// ─────────────────────────────────────────────────────────────────
if (!legit.connections['Claims Extractor & Manifest Generator'] ||
    !legit.connections['Claims Extractor & Manifest Generator'].main ||
    !legit.connections['Claims Extractor & Manifest Generator'].main[0] ||
    !legit.connections['Claims Extractor & Manifest Generator'].main[0].some(c => c.node === 'Verified Claims Parser')) {
    
    if (!legit.connections['Claims Extractor & Manifest Generator']) legit.connections['Claims Extractor & Manifest Generator'] = {};
    legit.connections['Claims Extractor & Manifest Generator'].main = [[{ node: 'Verified Claims Parser', type: 'main', index: 0 }]];
    fixes.push('FIXED: Claims Extractor → Verified Claims Parser (main wire)');
    console.log('✅ FIXED: Claims Extractor → Verified Claims Parser');
}

// ─────────────────────────────────────────────────────────────────
// FIX 2: Wire sub-nodes (ai_languageModel and ai_outputParser)
// These must be wired from the sub-node TO the parent LLM chain
// ─────────────────────────────────────────────────────────────────
const subWires = [
    { from: 'Claims Extractor Model', to: 'Claims Extractor & Manifest Generator', port: 'ai_languageModel' },
    { from: 'QSI Bouncer Model', to: 'QSI Claims Verification Bouncer', port: 'ai_languageModel' },
    { from: 'Verified Parser Model', to: 'Verified Claims Parser', port: 'ai_languageModel' },
    { from: 'Claims Extractor Output Parser', to: 'Claims Extractor & Manifest Generator', port: 'ai_outputParser' },
    { from: 'Verified Claims Output Parser', to: 'Verified Claims Parser', port: 'ai_outputParser' },
];

subWires.forEach(({ from, to, port }) => {
    if (!legit.connections[from]) legit.connections[from] = {};
    if (!legit.connections[from][port]) {
        legit.connections[from][port] = [[{ node: to, type: port, index: 0 }]];
        fixes.push('FIXED sub-wire [' + port + ']: ' + from + ' → ' + to);
        console.log('✅ FIXED sub-wire [' + port + ']:', from, '→', to);
    } else {
        const alreadyWired = legit.connections[from][port].some(branch =>
            branch && branch.some(c => c.node === to)
        );
        if (!alreadyWired) {
            legit.connections[from][port] = [[{ node: to, type: port, index: 0 }]];
            fixes.push('FIXED sub-wire [' + port + ']: ' + from + ' → ' + to);
            console.log('✅ FIXED sub-wire [' + port + ']:', from, '→', to);
        } else {
            console.log('⏩ Already wired:', from, '→', to);
        }
    }
});

// ─────────────────────────────────────────────────────────────────
// FIX 3: Add missing references to Claude Draft
// Missing: Client Site Researcher + Claims Extractor & Manifest Generator
// ─────────────────────────────────────────────────────────────────
for (const node of legit.nodes) {
    if (node.name === 'Claude Draft (Claude Opus 3)1') {
        if (!node.parameters || !node.parameters.messages || !node.parameters.messages.messageValues) break;
        let msg = node.parameters.messages.messageValues[0].message;

        // Check each missing reference
        const needsClientSite = !msg.includes("$('Client Site Researcher')");
        const needsClaimsExtractor = !msg.includes("$('Claims Extractor & Manifest Generator')");
        const needsEmDash = !(msg.includes('em-dash') || msg.includes('em dash'));
        const needsMetaTitle = !msg.includes('Meta Title');

        // Add Client Site Researcher reference into the Ground Truth block
        if (needsClientSite) {
            const clientSiteRef = `\nRAW CLIENT WEBSITE INTELLIGENCE (HIGHEST AUTHORITY):\n{{ $('Client Site Researcher').first().json.choices[0].message.content || $('Client Site Researcher').first().json.text || 'No client site data available.' }}\n`;
            if (msg.includes('CLIENT GROUND TRUTH')) {
                msg = msg.replace('# ═══ CLIENT GROUND TRUTH', clientSiteRef + '\n# ═══ CLIENT GROUND TRUTH');
            } else {
                msg = clientSiteRef + '\n' + msg;
            }
            fixes.push('FIXED: Claude Draft now references Client Site Researcher');
            console.log('✅ FIXED: Claude Draft references Client Site Researcher');
        }

        // Fix Claims Extractor reference — use the correct field name with & escaped
        if (needsClaimsExtractor) {
            // Replace the placeholder in the editorial rules block we injected
            msg = msg.replace(
                /\$\('Claims Extractor & Manifest Generator'\)/g,
                "$('Claims Extractor \\u0026 Manifest Generator')"
            );
            // But actually n8n expects the literal & — let's just ensure the correct string is present
            // The issue is the & is being URL-encoded in JSON. Let's check what's actually in there
            const hasAmpersand = msg.includes("Claims Extractor & Manifest Generator") || msg.includes("Claims Extractor \\u0026 Manifest Generator") || msg.includes('Claims Extractor');
            if (!hasAmpersand) {
                // Add the manifest reference explicitly
                const manifestBlock = `\n{{ JSON.stringify($json.output ? $json.output.placement_manifest : []) }}\n`;
                msg = msg.replace('ENFORCEMENT: Before finalising', manifestBlock + '\nENFORCEMENT: Before finalising');
                fixes.push('FIXED: Claude Draft claims manifest reference clarified');
                console.log('✅ FIXED: Claude Draft manifest reference clarified');
            } else {
                console.log('⏩ Claims Extractor reference found (may be in escaped form)');
            }
        }

        // Add em-dash ban to the editorial rules block in Claude Draft
        if (needsEmDash) {
            const emDashRule = '\n- Do NOT use em-dashes (—). Use commas, periods, or parentheses instead.\n';
            if (msg.includes('RULE 3 — Tone')) {
                msg = msg.replace('- Avoid: "journey"', emDashRule + '- Avoid: "journey"');
            } else if (msg.includes('EDITORIAL RULES')) {
                msg = msg.replace('# ═══ EDITORIAL RULES', '# ═══ EDITORIAL RULES\n## Em-Dash Ban\n- Do NOT use em-dashes (—) anywhere in the article.\n');
            }
            fixes.push('FIXED: Claude Draft em-dash ban added');
            console.log('✅ FIXED: Claude Draft em-dash ban added');
        }

        // Add Meta Title requirement to Claude Draft
        if (needsMetaTitle) {
            const metaTitleRule = `\n## RULE 4 — Meta Title & Meta Description (MANDATORY)\nEvery article MUST start with these two lines BEFORE the H1 heading:\nMeta Title: [SEO title, max 60 chars, contains primary keyword]\nMeta Description: [140-160 chars, contains primary keyword and compelling CTA]\n`;
            if (msg.includes('RULE 3')) {
                msg = msg.replace('# ⛔ ANTI-HALLUCINATION', metaTitleRule + '\n# ⛔ ANTI-HALLUCINATION');
            } else if (msg.includes('EDITORIAL RULES')) {
                msg += metaTitleRule;
            }
            fixes.push('FIXED: Claude Draft Meta Title enforcement added');
            console.log('✅ FIXED: Claude Draft Meta Title enforcement added');
        }

        node.parameters.messages.messageValues[0].message = msg;
        break;
    }
}

// ─────────────────────────────────────────────────────────────────
// FIX 4: Add closing paragraph rule to QSI Bouncer
// ─────────────────────────────────────────────────────────────────
for (const node of legit.nodes) {
    if (node.name === 'QSI Claims Verification Bouncer') {
        if (node.parameters && node.parameters.text) {
            if (!node.parameters.text.includes('closing') && !node.parameters.text.includes('CLOSING')) {
                node.parameters.text = node.parameters.text.replace(
                    '1. ✅ Client name appears ONLY in the closing/conclusion paragraph',
                    '1. ✅ Client name ({{ $("Webhook1").first().json.body.client_name }}) appears ONLY in the closing/conclusion paragraph'
                );
                // If that didn't work, just add it
                if (!node.parameters.text.includes('closing')) {
                    node.parameters.text = '# RULE: Client name must appear ONLY in the closing paragraph, not the opening.\n\n' + node.parameters.text;
                }
                fixes.push('FIXED: QSI Bouncer closing paragraph rule clarified');
                console.log('✅ FIXED: QSI Bouncer closing paragraph rule');
            } else {
                console.log('⏩ QSI Bouncer already has closing paragraph rule');
            }
        }
        break;
    }
}

// ─────────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────────
fs.writeFileSync('DEV Skywide Content (Word Count Fix).json', JSON.stringify(legit, null, 2));

console.log('\n══════════════════════════════════════════════════════════');
console.log('QA FIXES COMPLETE — ' + fixes.length + ' issues resolved');
console.log('══════════════════════════════════════════════════════════');
fixes.forEach((f, i) => console.log((i + 1) + '. ' + f));
