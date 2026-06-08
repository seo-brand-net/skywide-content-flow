/**
 * FIX SCRIPT — Addresses Billy's two reported issues:
 * 
 * FIX 1: Strengthen anti-hallucination rules in Claude Draft and QSI Bouncer
 *   - Add specific banned phrases Billy called out
 *   - Add unnamed-source ban
 *   - Add APA/organization attribution rule
 *   - Add "clinical experience shows" and "evidence-based programs incorporate" ban
 * 
 * FIX 2: Remove maxTokens cap on Structure Auditor Pass 1 & 2
 *   - 1,200 maxTokens causes mid-sentence truncation on 1,600-word articles
 *   - Set to 8,000 to ensure the full article passes through intact
 *   - Also set maxTokens on QSI Bouncer and all downstream editors for safety
 */

const fs = require('fs');

const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
fs.copyFileSync('DEV Skywide Content (Word Count Fix).json',
    'DEV Skywide Content (Word Count Fix) PRE-FABFIX ' + ts + '.json');
console.log('✅ Backup created');

const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
const fixes = [];

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1A: Claude Draft — add Billy's specific fabrication patterns to the ban list
// ─────────────────────────────────────────────────────────────────────────────

const FABRICATION_EXPANSION = `
# ⛔ FABRICATED ATTRIBUTION BAN — ZERO TOLERANCE
The following sentence patterns are CATEGORICALLY FORBIDDEN because they attribute claims
to unnamed sources or fabricate professional consensus. Remove or replace every instance:

BANNED PATTERN 1 — Unnamed practitioner attribution:
  ❌ "Treatment providers specializing in [X] consistently see [Y] when..."
  ❌ "Clinical experience across [field] consistently shows..."
  ❌ "Evidence-based programs in [X] typically incorporate..."
  ❌ "Professional standards from organizations like [X] recommend..."
  ❌ "Practitioners consistently see..."
  ❌ "Clinicians often find..."
  ❌ "Research consistently shows..." (without a named source + URL)
  ❌ "Studies suggest..." (without a named study + author + year)
  ❌ "Experts agree..." / "Experts recommend..."
  ❌ "Many professionals report..."
  ❌ "The [field] community recognizes..."

BANNED PATTERN 2 — Fabricated organization guidelines:
  ❌ Any claim attributed to the APA, AAP, AOTA, ASHA, or any organization 
     UNLESS it appears verbatim in the CLIENT GROUND TRUTH block below.
  ❌ "The American Psychological Association recommends..."
  ❌ "According to [organization]..." unless sourced from CLIENT GROUND TRUTH.

BANNED PATTERN 3 — Fabricated clinical/internal quotes:
  ❌ "Our patients report..." (unless from CLIENT GROUND TRUTH)
  ❌ "We have seen..." (unless from CLIENT GROUND TRUTH)  
  ❌ "In our experience, clients who..." (unless from CLIENT GROUND TRUTH)
  ❌ "Families who work with us typically..." (unless from CLIENT GROUND TRUTH)

RULE: If you cannot cite a specific named source (Author, Year, Publication), 
write the claim qualitatively WITHOUT attribution. 
Example: Instead of "Research consistently shows X improves Y," write "X can support Y."
This is always better than fabricating consensus.

`;

for (const node of wf.nodes) {
    if (node.name === 'Claude Draft (Claude Opus 3)1') {
        const msg = node.parameters.messages.messageValues[0].message;
        if (!msg.includes('FABRICATED ATTRIBUTION BAN')) {
            // Insert before the existing ANTI-HALLUCINATION block
            const insertAt = msg.indexOf('# ⛔ ANTI-HALLUCINATION PROTOCOL');
            if (insertAt > -1) {
                node.parameters.messages.messageValues[0].message =
                    msg.substring(0, insertAt) + FABRICATION_EXPANSION + msg.substring(insertAt);
                fixes.push('Claude Draft: added specific fabrication pattern ban (Billy\'s reported phrases)');
                console.log('✅ Claude Draft: fabrication ban expanded');
            }
        } else {
            console.log('⏩ Claude Draft already has fabrication ban');
        }
        break;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1B: QSI Bouncer — add specific fabrication scan instructions
// ─────────────────────────────────────────────────────────────────────────────

const BOUNCER_FABRICATION_SCAN = `
## ⛔ FABRICATED ATTRIBUTION SCAN (REQUIRED BEFORE OUTPUT)

Scan the entire article for these BANNED PATTERNS and REMOVE or REWRITE every instance:

**Banned unnamed-practitioner patterns:**
- "Treatment providers specializing in...consistently see..."
- "Clinical experience across...consistently shows..."
- "Evidence-based programs...typically incorporate..."
- "Professional standards from organizations like [X] recommend..."
- "Practitioners consistently see..." / "Clinicians often find..."
- "Research consistently shows..." (no named source)
- "Studies suggest..." (no named study + year)
- "Experts agree/recommend..." / "Many professionals report..."

**Banned fabricated organization citations:**
- Any claim attributed to APA, AAP, AOTA, ASHA, or any named organization
  UNLESS it was explicitly provided in the verified claims manifest above.

**How to handle violations:**
1. If a claim has no verified source → REMOVE the attribution, keep the qualitative statement
   (e.g. "Research consistently shows X improves Y" → "X can support Y")
2. If an org is cited but not in manifest → REMOVE the organization name entirely
3. If a clinical quote is fabricated → DELETE the sentence entirely

`;

for (const node of wf.nodes) {
    if (node.name === 'QSI Claims Verification Bouncer') {
        if (!node.parameters.text.includes('FABRICATED ATTRIBUTION SCAN')) {
            // Insert before the ## Rules section or ## Inputs section
            const insertAt = node.parameters.text.indexOf('## Rules');
            if (insertAt > -1) {
                node.parameters.text =
                    node.parameters.text.substring(0, insertAt) +
                    BOUNCER_FABRICATION_SCAN +
                    node.parameters.text.substring(insertAt);
            } else {
                node.parameters.text += '\n' + BOUNCER_FABRICATION_SCAN;
            }
            fixes.push('QSI Bouncer: added specific fabrication scan with Billy\'s banned patterns');
            console.log('✅ QSI Bouncer: fabrication scan expanded');
        } else {
            console.log('⏩ QSI Bouncer already has fabrication scan');
        }
        break;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: Fix maxTokens on ALL nodes that process the full article
// Structure Auditor was set to 1,200 — that truncates a 1,600-word article
// Set 8,000 tokens minimum on every node in the editing chain
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_NODES = [
    // These had 1,200 token cap — direct cause of mid-sentence truncation
    'Structure Auditor (Pass 1)',
    'Structure Auditor (Pass 2)',
    // Set safe limits on all editing nodes too
    'QSI Claims Verification Bouncer',
    'Claude Keyword Check + Semantic Gap1',
    'Claude Apply Recommendations1',
    'Claude EEAT Injection1',
    'Claude NLP & PR Optimization',
    'Claude Humanised Readability Rewrite',
    'Claude Final SEO Snippet Optimization',
    'Document Export Sanitization5',
    'Surgical Rewriter',
    'Claude Draft (Claude Opus 3)1',
    'Data Check & Research Gaps1',
    'Post-Draft Fact Checker',
];

for (const node of wf.nodes) {
    if (TOKEN_NODES.includes(node.name)) {
        if (!node.parameters) node.parameters = {};
        if (!node.parameters.options) node.parameters.options = {};

        const currentMax = node.parameters.options.maxTokens;

        // Structure Auditors had 1,200 — the direct truncation cause
        if (node.name === 'Structure Auditor (Pass 1)' || node.name === 'Structure Auditor (Pass 2)') {
            node.parameters.options.maxTokens = 8000;
            fixes.push(node.name + ': maxTokens raised from 1200 → 8000 (was truncating articles mid-sentence)');
            console.log('✅ CRITICAL FIX:', node.name, 'maxTokens 1200 → 8000');
        } else if (!currentMax || currentMax < 8000) {
            node.parameters.options.maxTokens = 8000;
            fixes.push(node.name + ': maxTokens set to 8000 (was: ' + (currentMax || 'unset') + ')');
            console.log('✅', node.name, 'maxTokens set to 8000');
        } else {
            console.log('⏩', node.name, 'maxTokens already', currentMax);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync('DEV Skywide Content (Word Count Fix).json', JSON.stringify(wf, null, 2));

console.log('\n══════════════════════════════════════════════════════════');
console.log('FIXES COMPLETE —', fixes.length, 'changes applied');
console.log('══════════════════════════════════════════════════════════');
fixes.forEach((f, i) => console.log((i + 1) + '. ' + f));
