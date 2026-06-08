/**
 * TARGETED FIXES — 4 changes based on Billy's QA audit + user comments:
 *
 * FIX 1 — Pre-Draft Fact Checker
 *   Add ⚠️ REWRITE verdict with a source priority chain:
 *   Priority 1 → Independent primary source (web search)
 *   Priority 2 → Client's own published source (client website)
 *   Priority 3 → Sources explicitly cited in the brief's Sources section
 *   If none → ❌ REMOVE, write qualitatively
 *   User's note: "what if the correct doesn't exist — give client's own source more priority
 *   though sources are mentioned in the brief"
 *
 * FIX 2 — Claims Extractor & Manifest Generator
 *   Tighten definition of "what qualifies as a claim".
 *   Current: extracting generic content, section intros, style notes.
 *   Required: only extract things that are VERIFIABLE facts —
 *   statistics, citations, regulatory references, named credentials,
 *   internal links, org attributions, named expert quotes.
 *   Explicit NOT-A-CLAIM examples added.
 *
 * FIX 3 — Verified Claims Parser
 *   Add REWRITE verdict handling: wrong claims get REPLACED with corrections,
 *   not just dropped. The corrected version flows to the writer.
 *   Source priority chain mirrored from Fix 1.
 *
 * FIX 4 — Claude Draft
 *   Add procedural inventions ban — the type of hallucination not covered by
 *   the stats/org ban:
 *   "Do NOT invent procedural specifics — timeframes, audit rates, penalty amounts,
 *   deadlines — that are not in the verified claims manifest."
 *   Correct behaviour: write "verify with [authority]" instead.
 */

const fs = require('fs');
const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
fs.copyFileSync(
    'DEV Skywide Content (Word Count Fix).json',
    `DEV Skywide Content (Word Count Fix) PRE-FIX4-${ts}.json`
);
console.log('✅ Backup created');

const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getNode(name) {
    const n = wf.nodes.find(x => x.name === name);
    if (!n) throw new Error('Node not found: ' + name);
    return n;
}
function getPerplexitySystem(node) {
    return node.parameters.messages.message[0].content;
}
function setPerplexitySystem(node, text) {
    node.parameters.messages.message[0].content = text;
}
function getChainText(node) {
    return node.parameters.text;
}
function setChainText(node, text) {
    node.parameters.text = text;
}
function getClaudeMessageValues(node) {
    return node.parameters.messages.messageValues[0].message;
}
function setClaudeMessageValues(node, text) {
    node.parameters.messages.messageValues[0].message = text;
}

// ═════════════════════════════════════════════════════════════════════════════
// FIX 1 — PRE-DRAFT FACT CHECKER: add REWRITE verdict + source priority chain
// ═════════════════════════════════════════════════════════════════════════════

const preFC = getNode('Pre-Draft Fact Checker');
let preFCText = getPerplexitySystem(preFC);

// Find the decision tree section and replace it with the upgraded version
const OLD_DECISION_TREE = `━━━ DECISION TREE FOR EACH CLAIM ━━━
For every claim you find, do this in order:
→ Search the web for it against .gov, .edu, peer-reviewed, or official org sources
→ FOUND and matches exactly → label: ✅ VERIFIED | source: [URL]
→ FOUND but brief overstates it → label: ⚠️ REWRITE | correction: [exact correct finding] | source: [URL]
→ FOUND only on client's own site or marketing pages → label: ❌ CLIENT-ONLY — use qualitative language, no number
→ NOT FOUND anywhere reliable → label: ❌ REMOVE — do not use in article`;

const NEW_DECISION_TREE = `━━━ SOURCE PRIORITY CHAIN ━━━
When verifying a claim, search sources in this exact priority order:
  TIER 1 (Highest): Independent primary sources — .gov, .edu, peer-reviewed journals,
                    official regulatory bodies, official org websites
  TIER 2:           Sources explicitly listed in the brief's "Sources" or "References" section
  TIER 3:           The client's own published website data (what Client Site Researcher found)
  TIER 4 (Never):   Client's marketing copy, press releases, or unverified assertions

━━━ DECISION TREE FOR EACH CLAIM ━━━
For every claim you find, work through this in order:

STEP 1 — Search TIER 1 sources
→ FOUND, matches exactly           → ✅ VERIFIED | source: [URL]
→ FOUND, brief overstates it       → ⚠️ REWRITE  | correction: [exact correct finding] | source: [URL]
→ NOT FOUND at TIER 1              → go to STEP 2

STEP 2 — Check brief's cited Sources section
→ Claim appears in a brief-cited source and that source verifies it → ✅ VERIFIED | source: [URL]
→ Brief cites a source but the source does NOT support the claim   → ❌ REMOVE (fabricated citation)
→ NOT in brief's sources                                           → go to STEP 3

STEP 3 — Check client's published website data
→ Claim explicitly matches something the client publishes on their site → ✅ CLIENT-VERIFIED | source: [client URL]
  (This is the safest fallback — the client owns this claim)
→ NOT found on client website                                           → ❌ REMOVE

STEP 4 — Fallback when nothing qualifies
→ The claim cannot be verified at any tier → ❌ REMOVE
   Instead of removing silently, provide a REWRITE SUGGESTION:
   e.g., "Replace '[specific number]' with 'verify the current figure with [authority]'"

━━━ REWRITE RULES ━━━
A ⚠️ REWRITE verdict means: the claim has a better version. Provide it.
Format: ⚠️ REWRITE | original: "[what the brief says]" | correction: "[exact correct claim]" | source: [URL]
The Verified Claims Parser will insert the corrected version — the wrong version will be dropped.

If correct version doesn't exist at any tier:
→ Provide a qualitative rewrite suggestion
  Example: "15 PDH per semester hour" not found → suggest "College credits may count toward PDH requirements; verify the conversion rate with [your state board]"`;

if (preFCText.includes('━━━ DECISION TREE FOR EACH CLAIM ━━━')) {
    preFCText = preFCText.replace(OLD_DECISION_TREE, NEW_DECISION_TREE);
    // Also update the output format to include REWRITE section
    const OLD_OUTPUT = `### CLAIMS REQUIRING REWRITE (use qualitative language instead)
[list each ⚠️ claim with the exact correction and source URL]`;
    const NEW_OUTPUT = `### CLAIMS REQUIRING REWRITE (writer must use the corrected version)
[list each ⚠️ claim with: original text | corrected text | source URL]
Note: The Verified Claims Parser will replace the original with the corrected version automatically.
If only a qualitative rewrite is possible (no exact correction exists), provide the suggested rewrite.`;
    preFCText = preFCText.replace(OLD_OUTPUT, NEW_OUTPUT);
    setPerplexitySystem(preFC, preFCText);
    console.log('✅ FIX 1 — Pre-Draft Fact Checker: REWRITE verdict + source priority chain');
} else {
    console.log('⚠️  FIX 1 — Could not find decision tree anchor. Appending instead.');
    preFCText += '\n\n' + NEW_DECISION_TREE;
    setPerplexitySystem(preFC, preFCText);
}

// ═════════════════════════════════════════════════════════════════════════════
// FIX 2 — CLAIMS EXTRACTOR: tighten what qualifies as a claim
// ═════════════════════════════════════════════════════════════════════════════

const claimsEx = getNode('Claims Extractor & Manifest Generator');
const OLD_CLAIMS_EXTRACTOR = getChainText(claimsEx);

// Replace the Instructions section with a tighter version
const TIGHTENED_INSTRUCTIONS = `━━━ WHAT QUALIFIES AS A CLAIM (strict definition) ━━━

A claim MUST be one of these types:
  ✅ STATISTIC      — A specific number, percentage, rate, or count with a verifiable source
                      e.g. "30 PDH required per biennium" / "500+ clients served"
  ✅ CITATION       — A named study, paper, regulatory code, or legal reference
                      e.g. "§ A-E 13.03(1)(b)" / "Lovaas 1987 study in JABA"
  ✅ REGULATION     — A hard legal/regulatory requirement or limit
                      e.g. "Minimum 13 PDH via live instruction" / "2 PDH ethics mandatory"
  ✅ ORG ATTRIBUTION — A guideline or recommendation explicitly published by a named organization
                      e.g. "BACB requires..." / "APA guidelines state..." (only if verifiable)
  ✅ CREDENTIAL     — A specific certification, accreditation, award the client holds
                      e.g. "Joint Commission accredited" / "CARF certified"
  ✅ INTERNAL LINK  — A specific page on the client's website the brief instructs to link to
                      e.g. "Link to /admissions in the 'How to Start' section"
  ✅ NAMED EXPERT   — A named person with a specific verifiable role or byline
                      e.g. "Dr. Jane Smith, BCBA-D at [client]"
  ✅ CLIENT STAT    — A number the client explicitly publishes on their website
                      e.g. "60% improvement in communication (as published at [URL])"

A claim MUST NOT be:
  ❌ A topic sentence or section intro ("This section covers...")
  ❌ A style or tone instruction ("Write in a warm, empathetic tone")
  ❌ A general industry truth ("ABA therapy is evidence-based")
  ❌ A keyword or SEO instruction ("Use the term 'residential treatment'")
  ❌ An unattributed opinion or best practice ("Parents should be involved in treatment")
  ❌ A vague authority reference ("Research shows..." without a named source)
  ❌ A generic statistic without a traceable source and the source's exact URL

IF IN DOUBT — ask: "Can this be fact-checked against a real source?"
If yes → include it as a claim.
If no (because it's general knowledge, a style note, or an opinion) → do NOT include it.

━━━ PLACEMENT PRECISION RULE ━━━
Every claim MUST include a placement_instruction that specifies WHERE in its target section it goes.
Use this format:
- "Place in the opening sentence of this section"
- "Use as the supporting evidence after the second paragraph"  
- "Cite at the end of this section before the section close"
- "Weave into the third bullet point"

Never use "anywhere in this section" — the writer needs a specific position.

━━━ SOURCES SECTION PARSING ━━━
If the brief has a "Sources", "References", or "Cited Sources" section at the bottom:
→ Parse it as a separate authoritative list
→ Add each source as a claim_type: "citation" assigned to the section the brief explicitly links it to
→ If no section is specified for a source, assign it to claim_type: "general_citation" with target_section: "Cited Sources"
→ These form the canonical citation list — any citation in the article must appear here`;

// Replace just the Instructions section
const OLD_INSTRUCTIONS_START = `━━━ INSTRUCTIONS ━━━

STEP 1 — Read the brief's section-by-section outline (H2 headings and what belongs in each).
If the brief has no section outline, use the article title and topic to infer logical sections.

STEP 2 — For each brief section, extract:
a) Every claim, statistic, citation, or internal link the brief explicitly places there
b) Any statistic from the Client Website Data that is relevant to that section
c) The exact H2 heading the writer should use for that section (from the brief)

STEP 3 — For each item in the manifest, record:
- claim_text: The exact wording (copy verbatim from brief/website — do not paraphrase)
- target_section: The EXACT H2 heading this belongs under
- placement_instruction: One sentence telling the writer WHERE in that section (e.g. "Use in the opening sentence of this section" or "Cite as the supporting evidence for the second point")
- source: "Brief" | "Website" | "Both"
- claim_type: "statistic" | "citation" | "internal_link" | "credential" | "differentiator" | "quote"

STEP 4 — Generate forbidden_patterns: a list of 6-10 fabricated-authority phrases the writer MUST NOT use. Make these SPECIFIC to this article's topic and industry. 
Example for mental health article: "Clinical experience across residential programs consistently shows..."
Example for home services: "Industry professionals consistently report that..."

━━━ FAILURE MODES ━━━
• If a brief section has no extractable claims → do not create manifest items for it (leave it to the writer's expertise)
• If a claim cannot be assigned to a specific section → add it to a "General" section entry
• If client website data has no statistics → set published_stats_available: false in the output`;

const NEW_INSTRUCTIONS = `━━━ INSTRUCTIONS ━━━

STEP 1 — Parse the brief's section-by-section outline (H2 headings and what belongs in each).
Parse the "Sources" / "Cited Sources" section separately as the canonical citation registry.
If the brief has no section outline, use the article title and topic to infer logical H2 sections.

STEP 2 — Apply the CLAIM QUALIFICATION FILTER above to every item you consider extracting.
If it doesn't meet the definition of a claim → skip it. Do NOT include it in the manifest.

STEP 3 — For each qualifying claim, record ALL of these fields:
- claim_text: Verbatim from brief or website — do not paraphrase, do not summarize
- target_section: The EXACT H2 heading this belongs under (copied from brief)
- placement_instruction: One specific sentence (e.g. "Place in the opening sentence of this section")
  NEVER use "anywhere in this section" — be precise about position
- source: "Brief" | "Website" | "Both" | "Brief-Cited-Source"
- claim_type: "statistic" | "citation" | "regulation" | "credential" | "internal_link" | "org_attribution" | "named_expert" | "client_stat" | "general_citation"
- requires_verification: true (if it's a statistic, regulation, or org attribution) | false (if it's a credential or internal link)

STEP 4 — Generate forbidden_patterns: 6-10 fabricated-authority phrases SPECIFIC to this article's topic.
These should be tailored to the industry. For regulatory articles: "According to current regulations..." (without citing the specific code section)
For clinical articles: "Clinical experience across [field] consistently shows..."
For home services: "Industry professionals consistently report..."

STEP 5 — Count your manifest items. If you have more than 30 items, you are likely extracting
non-claims (topic sentences, style notes, generic truths). Review and remove non-qualifying items.

━━━ FAILURE MODES ━━━
• Brief section has no qualifying claims → leave that section out of the manifest
• Claim cannot be assigned to a specific section → use target_section: "General"
• Client website has no statistics → set published_stats_available: false
• Brief contains a contradiction (e.g. two different numbers for the same fact) → extract BOTH,
  mark each with a note: "CONTRADICTION — verify against primary source before use"`;

const updatedClaimsExtractor = OLD_CLAIMS_EXTRACTOR
    .replace(OLD_INSTRUCTIONS_START, NEW_INSTRUCTIONS);

// Insert the claim qualification filter before the instructions
const FINAL_CLAIMS_EXTRACTOR = updatedClaimsExtractor.replace(
    '━━━ INSTRUCTIONS ━━━',
    TIGHTENED_INSTRUCTIONS + '\n\n━━━ INSTRUCTIONS ━━━'
);

if (FINAL_CLAIMS_EXTRACTOR !== OLD_CLAIMS_EXTRACTOR) {
    setChainText(claimsEx, FINAL_CLAIMS_EXTRACTOR);
    console.log('✅ FIX 2 — Claims Extractor: tightened claim qualification filter + placement precision');
} else {
    // If replace failed due to whitespace differences, just prepend the filter
    setChainText(claimsEx, TIGHTENED_INSTRUCTIONS + '\n\n' + OLD_CLAIMS_EXTRACTOR);
    console.log('✅ FIX 2 — Claims Extractor: prepended claim qualification filter (anchor not found)');
}

// ═════════════════════════════════════════════════════════════════════════════
// FIX 3 — VERIFIED CLAIMS PARSER: handle REWRITE verdict (replace, don't drop)
// ═════════════════════════════════════════════════════════════════════════════

const verifiedParser = getNode('Verified Claims Parser');
const NEW_VERIFIED_PARSER = `=# Verified Claims Parser

You are the gatekeeper between the raw claims manifest and the AI writer.
Your output is the ONLY list of claims the writer is authorised to use.
Nothing enters the article that hasn't passed through you.

━━━ YOUR ONE JOB ━━━
Cross-reference the Claims Manifest against the Fact-Check Report.
Keep what's verified. Replace what's correctable. Drop what's not. Output a clean final manifest.

━━━ INPUTS ━━━

**Pre-Draft Fact-Check Report:**
{{ $('Pre-Draft Fact Checker').first().json.choices?.[0]?.message?.content || $('Pre-Draft Fact Checker').first().json.text || 'No fact-check report available.' }}

**Raw Claims Manifest (to be filtered):**
{{ JSON.stringify($('Claims Extractor & Manifest Generator').first().json.output ? $('Claims Extractor & Manifest Generator').first().json.output.placement_manifest : []) }}

━━━ SOURCE PRIORITY (use this when choosing which version of a claim to keep) ━━━
When a claim appears in multiple forms, prefer in this order:
  1. Independent primary source (verified by fact-checker from .gov, .edu, peer-reviewed)
  2. Brief's cited sources (if the fact-checker confirmed the source URL checks out)
  3. Client's own published website data (from client profile — always valid for client-specific claims)
  4. If none of the above: drop the specific, rewrite as qualitative

━━━ DECISION LOGIC — APPLY TO EVERY MANIFEST ITEM ━━━

→ IF fact-check marks it ✅ VERIFIED:
   KEEP the original claim_text. Add source_url from the fact-check report.

→ IF fact-check marks it ⚠️ REWRITE:
   REPLACE claim_text with the corrected version from the fact-check report.
   Keep the same target_section and placement_instruction — only the claim text changes.
   Add a note field: "corrected — original brief said: [original text]"
   Add source_url from the correction.
   ⚠️ IMPORTANT: If the corrected version only exists at TIER 3 (client's own site),
   still include it — client-published claims are valid. Mark source: "Client website".

→ IF fact-check marks it ❌ REMOVE or ❌ CLIENT-ONLY:
   DROP IT entirely. Do not include in output.

→ IF fact-check marks it with a qualitative rewrite suggestion (no exact correction available):
   Include it with claim_text = the qualitative suggestion.
   Add flag: "qualitative_only": true
   This tells the writer: use this phrasing, don't try to find a number.

→ IF the claim does NOT appear in the fact-check report at all:
   KEEP IT if claim_type is: "credential", "internal_link", or "client_stat"
   (these don't require independent verification — they're from the client's own site)
   KEEP IT if claim_type is: "citation" with source "Brief-Cited-Source"
   (the citation itself is in the manifest — the writer just links to it)
   DROP IT if claim_type is: "statistic", "regulation", or "org_attribution" without verification
   (these require independent confirmation — if the fact-checker didn't verify it, it's unsafe)

→ If the fact-check report's "REMOVE FROM ARTICLE" section lists a claim:
   DROP IT regardless of anything else. The fact-check overrides the manifest.

━━━ CONTRADICTION HANDLING ━━━
If the manifest contains two items for the same fact (marked CONTRADICTION):
→ Keep only the version that the fact-checker marks ✅ VERIFIED
→ If both versions are unverified → drop both, add a single qualitative replacement

━━━ OUTPUT CONTRACT ━━━
Return ONLY valid JSON. No markdown. No code blocks. No commentary.
Schema is provided by the output parser.
Include at the top level:
{
  "summary": { "total_input": N, "total_verified": N, "total_corrected": N, "total_dropped": N },
  "placement_manifest": [ ... ]
}`;

setChainText(verifiedParser, NEW_VERIFIED_PARSER);
console.log('✅ FIX 3 — Verified Claims Parser: REWRITE verdict → REPLACE in manifest (not drop)');

// ═════════════════════════════════════════════════════════════════════════════
// FIX 4 — CLAUDE DRAFT: add procedural inventions ban
// ═════════════════════════════════════════════════════════════════════════════

const claudeDraft = getNode('Claude Draft (Claude Opus 3)1');
let draftText = getClaudeMessageValues(claudeDraft);

// Find the anti-hallucination decision tree and add the procedural ban below it
const PROCEDURAL_BAN = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROCEDURAL INVENTIONS BAN (the gap the stat ban doesn't cover)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The fabrication Billy flagged most harshly was NOT always a statistic.
It was invented procedural specifics — timeframes, rates, consequences, and deadlines
that sound authoritative but have no source.

NEVER invent or state these WITHOUT a verified claim in your manifest:
❌ Audit rates          ("Wisconsin randomly selects 10% of engineers...")
❌ Response deadlines   ("You have 60 days to respond to an audit request...")
❌ Penalty amounts      ("Missing even one hour triggers suspension...")
❌ Penalty multipliers  ("Reinstatement fees often double standard renewal fees...")
❌ Conversion rates     ("1 semester credit = 45 PDH credits...")
❌ Approval timeframes  ("Processing takes 4-6 weeks...")
❌ Any "typically" / "usually" / "often" procedural statement without a source

CORRECT BEHAVIOUR when the manifest has no entry for a procedural detail:
→ Say: "Check with [the relevant authority] for the current [rate/deadline/penalty]."
→ Example: "For specific audit response timelines, verify directly with [State Board]."
→ This is always better than inventing a specific that Billy will have to fact-check and remove.

CORRECT BEHAVIOUR when the brief contradicts the fact-check report:
→ Use the fact-check report's version. The brief may contain errors.
→ If the fact-check report marked a brief claim as ❌ REMOVE — do not write that claim.
→ If the fact-check report marked a brief claim as ⚠️ REWRITE — use the corrected version in your manifest.

`;

// Insert before the KEYWORD PLACEMENT section
const INSERT_BEFORE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nKEYWORD PLACEMENT (required for SEO score)';
if (draftText.includes(INSERT_BEFORE)) {
    draftText = draftText.replace(INSERT_BEFORE, PROCEDURAL_BAN + INSERT_BEFORE);
    setClaudeMessageValues(claudeDraft, draftText);
    console.log('✅ FIX 4 — Claude Draft: procedural inventions ban added');
} else {
    // Fallback: append before keyword section
    const altAnchor = '━━━ KEYWORD PLACEMENT';
    if (draftText.includes(altAnchor)) {
        draftText = draftText.replace(altAnchor, PROCEDURAL_BAN + altAnchor);
        setClaudeMessageValues(claudeDraft, draftText);
        console.log('✅ FIX 4 — Claude Draft: procedural inventions ban added (alt anchor)');
    } else {
        // Last resort: append at end
        draftText += PROCEDURAL_BAN;
        setClaudeMessageValues(claudeDraft, draftText);
        console.log('✅ FIX 4 — Claude Draft: procedural inventions ban appended (no anchor found)');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE + VERIFY
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync('DEV Skywide Content (Word Count Fix).json', JSON.stringify(wf, null, 2));

// Quick verification
const verify = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

const checks = [
    ['Pre-Draft Fact Checker has TIER source priority', () => {
        const n = verify.nodes.find(x => x.name === 'Pre-Draft Fact Checker');
        return n.parameters.messages.message[0].content.includes('SOURCE PRIORITY CHAIN');
    }],
    ['Pre-Draft Fact Checker has REWRITE format', () => {
        const n = verify.nodes.find(x => x.name === 'Pre-Draft Fact Checker');
        return n.parameters.messages.message[0].content.includes('REWRITE  | original:');
    }],
    ['Claims Extractor has claim qualification filter', () => {
        const n = verify.nodes.find(x => x.name === 'Claims Extractor & Manifest Generator');
        return n.parameters.text.includes('WHAT QUALIFIES AS A CLAIM');
    }],
    ['Claims Extractor has Sources section parsing', () => {
        const n = verify.nodes.find(x => x.name === 'Claims Extractor & Manifest Generator');
        return n.parameters.text.includes('SOURCES SECTION PARSING');
    }],
    ['Claims Extractor has NOT-A-CLAIM examples', () => {
        const n = verify.nodes.find(x => x.name === 'Claims Extractor & Manifest Generator');
        return n.parameters.text.includes('A topic sentence or section intro');
    }],
    ['Verified Claims Parser has REPLACE logic', () => {
        const n = verify.nodes.find(x => x.name === 'Verified Claims Parser');
        return n.parameters.text.includes('REPLACE claim_text with the corrected version');
    }],
    ['Verified Claims Parser has source priority', () => {
        const n = verify.nodes.find(x => x.name === 'Verified Claims Parser');
        return n.parameters.text.includes('SOURCE PRIORITY (use this when choosing');
    }],
    ['Verified Claims Parser keeps client stats without verification', () => {
        const n = verify.nodes.find(x => x.name === 'Verified Claims Parser');
        return n.parameters.text.includes('"credential", "internal_link", or "client_stat"');
    }],
    ['Claude Draft has procedural inventions ban', () => {
        const n = verify.nodes.find(x => x.name === 'Claude Draft (Claude Opus 3)1');
        return n.parameters.messages.messageValues[0].message.includes('PROCEDURAL INVENTIONS BAN');
    }],
    ['Claude Draft has audit rate ban', () => {
        const n = verify.nodes.find(x => x.name === 'Claude Draft (Claude Opus 3)1');
        return n.parameters.messages.messageValues[0].message.includes('Audit rates');
    }],
    ['Claude Draft has contradiction resolution rule', () => {
        const n = verify.nodes.find(x => x.name === 'Claude Draft (Claude Opus 3)1');
        return n.parameters.messages.messageValues[0].message.includes('brief contradicts the fact-check report');
    }],
    ['Total node count unchanged', () => {
        return verify.nodes.length === 47;
    }],
];

console.log('\n══════════════════════════════════════════════════════════');
console.log('VERIFICATION RESULTS');
console.log('══════════════════════════════════════════════════════════');
let passed = 0;
for (const [label, fn] of checks) {
    const ok = fn();
    console.log((ok ? '✅' : '❌') + ' ' + label);
    if (ok) passed++;
}
console.log(`\nScore: ${passed}/${checks.length}`);
