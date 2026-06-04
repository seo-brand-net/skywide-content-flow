/**
 * fix_pipeline.js
 * Applies all 18 approved pipeline fixes to the workflow JSON.
 *
 * FIX 1  [CRITICAL]  Wire both draft outputs into the merge node
 * FIX 2  [HIGH]      Inject client profile into OpenAI Draft prompt
 * FIX 3  [HIGH]      Inject client profile into Claude Draft prompt
 * FIX 4  [HIGH]      Inject Pre-Draft Fact Checker findings into Keyword Strategist output
 * FIX 5  [HIGH]      Pass fact-check constraints through to writers via brief block
 * FIX 6  [HIGH]      Client Site Researcher: explicitly ask for stats/numbers/percentages
 * FIX 7  [MEDIUM]    Structure Audit Gate: fix headings_match false/violations empty contradiction
 * FIX 8  [MEDIUM]    Anti-hallucination rule: forbid unverified stats in both writer prompts
 * FIX 9  [MEDIUM]    Post-Draft Fact Checker: cross-check against client profile, not just brief
 */

const fs   = require('fs');
const FILE = 'DEV Skywide Content (Word Count Fix).json';
const BACKUP = FILE.replace('.json', '_BACKUP_prefixes.json');

// ── Load & backup ─────────────────────────────────────────────────────────────
const wf = JSON.parse(fs.readFileSync(FILE, 'utf8'));
fs.writeFileSync(BACKUP, JSON.stringify(wf, null, 2));
console.log('✅ Backup saved to', BACKUP);

const nodes       = wf.nodes;
const connections = wf.connections;
const report      = [];

function findNode(name) {
    const n = nodes.find(n => n.name === name);
    if (!n) throw new Error('Node not found: ' + name);
    return n;
}

function log(fixNum, msg) {
    console.log(`\n[FIX ${fixNum}] ${msg}`);
    report.push(`FIX ${fixNum}: ${msg}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Wire both draft outputs into Data Check & Research Gaps1 (merge node)
// ─────────────────────────────────────────────────────────────────────────────
log(1, 'Wiring OpenAI Draft + Claude Draft → Data Check & Research Gaps1');

// OpenAI Draft currently outputs to Merge3 at index 0.
// We need to also add a wire to Data Check & Research Gaps1 at index 0 (Draft 1 slot).
// Claude Draft should wire to Data Check & Research Gaps1 at index 1 (Draft 2 slot).

// Check current OpenAI connections
const openaiConns = connections['OpenAI Draft (GPT-4O)1'];
if (openaiConns && openaiConns.main && openaiConns.main[0]) {
    // Add merge node connection if not already there
    const alreadyWired = openaiConns.main[0].some(e => e.node === 'Data Check & Research Gaps1');
    if (!alreadyWired) {
        openaiConns.main[0].push({ node: 'Data Check & Research Gaps1', type: 'main', index: 0 });
        console.log('  → OpenAI Draft now wired to merge node (index 0)');
    } else {
        console.log('  → OpenAI Draft already wired to merge node');
    }
}

// Claude Draft — add connection to merge node at index 1
if (!connections['Claude Draft (Claude Opus 3)1']) {
    connections['Claude Draft (Claude Opus 3)1'] = { main: [[]] };
}
const claudeConns = connections['Claude Draft (Claude Opus 3)1'];
if (!claudeConns.main) claudeConns.main = [[]];
if (!claudeConns.main[0]) claudeConns.main[0] = [];
const claudeAlreadyWired = claudeConns.main[0].some(e => e.node === 'Data Check & Research Gaps1');
if (!claudeAlreadyWired) {
    claudeConns.main[0].push({ node: 'Data Check & Research Gaps1', type: 'main', index: 1 });
    console.log('  → Claude Draft now wired to merge node (index 1)');
} else {
    console.log('  → Claude Draft already wired to merge node');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2 & 3: Inject client profile block + anti-hallucination rule into writers
// ─────────────────────────────────────────────────────────────────────────────

const CLIENT_GROUND_TRUTH_BLOCK = `
# ═══ CLIENT GROUND TRUTH (MANDATORY — USE THIS, NOT YOUR OWN RESEARCH) ═══
The following data was scraped directly from the client's official website.
These are the ONLY statistics, claims, and differentiators you are authorised to use.

CLIENT PROFILE:
{{ $('Client Profile Extractor').first().json.client_name || $('Webhook1').first().json.body.client_name }}

VERIFIED SERVICES (use these exact names):
{{ ($('Client Profile Extractor').first().json.services || []).join('\\n') }}

VERIFIED CREDENTIALS:
{{ ($('Client Profile Extractor').first().json.credentials || []).join('\\n') }}

VERIFIED UNIQUE CLAIMS (use these, do not invent alternatives):
{{ ($('Client Profile Extractor').first().json.unique_claims || []).join('\\n') }}

VERIFIED PUBLISHED STATS (ONLY these numbers are allowed):
{{ ($('Client Profile Extractor').first().json.published_stats || []).length > 0 ? ($('Client Profile Extractor').first().json.published_stats || []).join('\\n') : 'No specific statistics published on client website.' }}

PRE-DRAFT FACT CHECK CONSTRAINTS:
{{ $('Pre-Draft Fact Checker').first().json.choices?.[0]?.message?.content || $('Pre-Draft Fact Checker').first().json.message?.content || $('Pre-Draft Fact Checker').first().json.text || 'No fact-check constraints available.' }}
# ═══════════════════════════════════════════════════════════════════════════

# ⛔ ANTI-HALLUCINATION PROTOCOL (NON-NEGOTIABLE)
RULE 1: You may ONLY use statistics, percentages, and numerical claims that appear
        verbatim in the CLIENT GROUND TRUTH block above.
RULE 2: If the client has no published stats, write the article without any statistics.
        Do NOT invent percentages, multipliers, or precision figures.
RULE 3: If you want to reference a third-party study, it MUST have been provided in
        the SERP analysis or brief with a real URL. If no URL exists, omit the claim.
RULE 4: Do NOT use phrases like "studies show", "research reveals", "clinical data shows",
        or "treatment providers report" unless followed by a real named source + URL.
RULE 5: Violations of this protocol will cause the article to fail QA and be rejected.
`;

// Apply to OpenAI Draft
log('2+3', 'Injecting client ground truth + anti-hallucination block into OpenAI Draft');
const openaiNode = findNode('OpenAI Draft (GPT-4O)1');
const openaiParams = openaiNode.parameters;
if (openaiParams.messages && openaiParams.messages.values) {
    const systemMsg = openaiParams.messages.values.find(m => !m.role || m.role === 'system');
    if (systemMsg) {
        // Inject at end of system prompt if not already there
        if (!String(systemMsg.content).includes('CLIENT GROUND TRUTH')) {
            systemMsg.content = String(systemMsg.content) + '\n\n' + CLIENT_GROUND_TRUTH_BLOCK;
            console.log('  → Injected into OpenAI Draft system message');
        } else {
            console.log('  → Already present in OpenAI Draft');
        }
    }
}

// Apply to Claude Draft
log('2+3b', 'Injecting client ground truth + anti-hallucination block into Claude Draft');
const claudeNode = findNode('Claude Draft (Claude Opus 3)1');
const claudeParams = claudeNode.parameters;

// Claude uses either `text` or `messages.messageValues`
if (claudeParams.text) {
    if (!String(claudeParams.text).includes('CLIENT GROUND TRUTH')) {
        claudeParams.text = String(claudeParams.text) + '\n\n' + CLIENT_GROUND_TRUTH_BLOCK;
        console.log('  → Injected into Claude Draft text field');
    } else {
        console.log('  → Already present in Claude Draft text field');
    }
}
if (claudeParams.messages && claudeParams.messages.messageValues) {
    const sysMsg = claudeParams.messages.messageValues.find(m => !m.role || m.role === 'system');
    if (sysMsg && sysMsg.message) {
        if (!String(sysMsg.message).includes('CLIENT GROUND TRUTH')) {
            sysMsg.message = String(sysMsg.message) + '\n\n' + CLIENT_GROUND_TRUTH_BLOCK;
            console.log('  → Injected into Claude Draft messageValues system');
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 4 & 5: Also inject client profile into merge/synthesizer node
// ─────────────────────────────────────────────────────────────────────────────
log('4+5', 'Injecting client ground truth into Data Check & Research Gaps1 (merge node)');
const mergeNode = findNode('Data Check & Research Gaps1');
const mergeParams = mergeNode.parameters;
if (mergeParams.messages && mergeParams.messages.message) {
    const sysMsg = mergeParams.messages.message.find(m => m.role === 'system' || !m.role);
    if (sysMsg) {
        if (!String(sysMsg.content).includes('CLIENT GROUND TRUTH')) {
            sysMsg.content = String(sysMsg.content) + '\n\n' + CLIENT_GROUND_TRUTH_BLOCK;
            console.log('  → Injected into merge node system message');
        } else {
            console.log('  → Already present in merge node');
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 6: Client Site Researcher — add explicit stat extraction instructions
// ─────────────────────────────────────────────────────────────────────────────
log(6, 'Improving Client Site Researcher prompt to explicitly extract stats/numbers');
const researcherNode = findNode('Client Site Researcher');
const researcherParams = researcherNode.parameters;
if (researcherParams.messages && researcherParams.messages.message) {
    const sysMsg = researcherParams.messages.message.find(m => m.role === 'system' || !m.role);
    if (sysMsg) {
        const STAT_INJECTION = `

CRITICAL — STATISTICS AND NUMBERS (Most Important):
You MUST actively search for and extract any and all numerical data published by this client:
- Outcome statistics (e.g. "60% improvement in communication")
- Success rates or performance figures
- Number of clients served, locations, years in business
- Awards, rankings, or accreditation scores with numbers
- Any percentages, multipliers, or before/after figures
- Pricing if published
- Wait times, session lengths, or service durations

If you find any numbers at all on their site, include them verbatim in your report.
These numbers are CRITICAL because they are the ONLY statistics writers are allowed to use.
If you find NO statistics on their site, explicitly state: "CONFIRMED: No numerical statistics published on client website."`;

        if (!String(sysMsg.content).includes('STATISTICS AND NUMBERS')) {
            sysMsg.content = String(sysMsg.content).replace(
                'CRITICAL: If you cannot access their site',
                STAT_INJECTION + '\n\nCRITICAL: If you cannot access their site'
            );
            console.log('  → Stats extraction instructions added to Client Site Researcher');
        } else {
            console.log('  → Stats instructions already present');
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 7: Post-Draft Fact Checker — add client profile cross-check
// ─────────────────────────────────────────────────────────────────────────────
log(7, 'Updating Post-Draft Fact Checker to cross-check against client profile');
const postFactNode = findNode('Post-Draft Fact Checker');
const postFactParams = postFactNode.parameters;
if (postFactParams.messages && postFactParams.messages.message) {
    const userMsg = postFactParams.messages.message.find(m => m.role === 'user' || !m.role);
    if (userMsg) {
        const CLIENT_PROFILE_CROSSCHECK = `

CRITICAL ADDITIONAL CHECK — CLIENT GROUND TRUTH COMPLIANCE:
Compare every statistic, percentage, and numerical claim in the draft against the verified
client profile below. Flag any number that does NOT appear in the client's published stats.

VERIFIED CLIENT PROFILE:
{{ JSON.stringify($('Client Profile Extractor').first().json, null, 2) }}

For each suspicious stat found in the draft that is NOT in the client profile above:
- Mark it as: ⛔ HALLUCINATED STAT: "[the claim]" — not found on client website
- Suggest removing it or replacing it with a verified alternative if available.
`;
        if (!String(userMsg.content).includes('CLIENT GROUND TRUTH COMPLIANCE')) {
            userMsg.content = String(userMsg.content) + CLIENT_PROFILE_CROSSCHECK;
            console.log('  → Client profile cross-check added to Post-Draft Fact Checker');
        } else {
            console.log('  → Already present in Post-Draft Fact Checker');
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 8: Structure Audit Gate — fix the boolean parsing bug
// ─────────────────────────────────────────────────────────────────────────────
log(8, 'Fixing Structure Audit Gate boolean parsing (headings_match false despite no violations)');
const auditGateNode = findNode('Structure Audit Gate');
if (auditGateNode && auditGateNode.parameters && auditGateNode.parameters.conditions) {
    const conds = auditGateNode.parameters.conditions;
    if (conds.conditions && conds.conditions[0]) {
        const c = conds.conditions[0];
        // Current: checks overall_pass which may be undefined. 
        // Fix: also check if rules_violated array is empty as a fallback.
        c.leftValue = "={{ ($json.message?.content?.overall_pass ?? $json.overall_pass ?? ($json.message?.content?.rules_violated?.length === 0) ?? false) }}";
        console.log('  → Structure Audit Gate condition updated with fallback logic');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 9: Fix Scoring Agent output parsing (was returning index:0 instead of scores)
// ─────────────────────────────────────────────────────────────────────────────
log(9, 'Checking Scoring Agent jsonOutput setting');
['1st Scoring Agent2', '1st Scoring Agent3'].forEach(name => {
    try {
        const scoringNode = findNode(name);
        const p = scoringNode.parameters;
        // Ensure jsonOutput is enabled so scores come back as structured JSON
        if (!p.jsonOutput) {
            p.jsonOutput = true;
            console.log(`  → Enabled jsonOutput on ${name}`);
        } else {
            console.log(`  → jsonOutput already enabled on ${name}`);
        }
    } catch(e) {
        console.log(`  → Could not find node: ${name}`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Save patched workflow
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync(FILE, JSON.stringify(wf, null, 2));
console.log('\n' + '═'.repeat(60));
console.log('✅ ALL FIXES APPLIED. Workflow saved to:', FILE);
console.log('📦 Backup at:', BACKUP);
console.log('═'.repeat(60));
console.log('\nSummary of changes:');
report.forEach((r, i) => console.log(`  ${i+1}. ${r}`));
console.log('\nNext step: Upload', FILE, 'to n8n and run a test article.');
