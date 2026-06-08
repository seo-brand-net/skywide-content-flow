/**
 * FIX: Correct source priority chain
 * Client's own website is TIER 1 for client-specific claims.
 * Independent sources are TIER 1 for regulatory/research claims only.
 *
 * The two-track approach:
 *   TRACK A (client-specific): client website first → external sources NEVER override client identity
 *   TRACK B (general/regulatory): independent sources first → client website cannot verify a law or study
 */

const fs = require('fs');

const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
fs.copyFileSync(
    'DEV Skywide Content (Word Count Fix).json',
    `DEV Skywide Content (Word Count Fix) PRE-PRIORITY-${ts}.json`
);
console.log('Backup created');

const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// ─────────────────────────────────────────────────────────────────────────────
// 1. Pre-Draft Fact Checker — replace the SOURCE PRIORITY CHAIN block
// ─────────────────────────────────────────────────────────────────────────────

const preFC = wf.nodes.find(n => n.name === 'Pre-Draft Fact Checker');
let txt = preFC.parameters.messages.message[0].content;

// Locate and replace the entire priority + decision tree block
const startMarker = '\u2501\u2501\u2501 SOURCE PRIORITY CHAIN \u2501\u2501\u2501';
const endMarker = '\u2501\u2501\u2501 REWRITE RULES \u2501\u2501\u2501';

const startIdx = txt.indexOf(startMarker);
const endIdx = txt.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.log('ERROR: Could not find markers in Pre-Draft Fact Checker');
    console.log('startIdx:', startIdx, 'endIdx:', endIdx);
    process.exit(1);
}

const NEW_PRIORITY_AND_TREE = `\u2501\u2501\u2501 CLAIM TYPE \u2014 TWO TRACKS \u2501\u2501\u2501

Claims fall into two distinct types. Classify each claim before verifying it:

TRACK A \u2014 CLIENT-SPECIFIC CLAIMS
These are facts about what the client does, offers, holds, or publishes about themselves.
Examples: services they offer, credentials they hold, program names, team members,
          outcome stats they publish, locations, awards, differentiators.
Priority: The client\u2019s own website is the PRIMARY authority for facts about themselves.
          You are verifying that the claim exists on their site \u2014 not second-guessing it with external sources.

TRACK B \u2014 GENERAL / REGULATORY / RESEARCH CLAIMS
These are facts about the world outside the client.
Examples: legal requirements, named studies, org guidelines, industry statistics,
          regulatory codes, third-party research findings.
Priority: These MUST be verified against independent primary sources.
          A client\u2019s website cannot verify a legal requirement or a third-party study.

\u2501\u2501\u2501 SOURCE PRIORITY CHAIN \u2501\u2501\u2501

FOR TRACK A (client-specific claims):
  \u25ba TIER 1 (Highest): Client\u2019s own published website (from Client Site Researcher data)
                    If the claim is published on their site \u2192 \u2705 CLIENT-VERIFIED
                    The client owns this claim. Do not second-guess it.
  \u25ba TIER 2:         Sources the client explicitly cites on their website
  \u25ba NEVER:          Do not use independent sources to override what a client says about themselves.
                    You are not fact-checking their identity.

FOR TRACK B (general/regulatory/research claims):
  \u25ba TIER 1 (Highest): Independent primary sources \u2014 .gov, .edu, peer-reviewed journals,
                    official regulatory bodies, official org websites
  \u25ba TIER 2:         Sources explicitly listed in the brief\u2019s \u201cSources\u201d or \u201cReferences\u201d section
  \u25ba NEVER:          Client\u2019s website cannot verify a law, study, or third-party guideline

\u2501\u2501\u2501 DECISION TREE FOR EACH CLAIM \u2501\u2501\u2501
For every claim, first classify it (Track A or Track B), then apply:

IF TRACK A \u2014 Client-specific claim:
\u25ba Is this claim published on the client\u2019s own website?
   YES \u2192 \u2705 CLIENT-VERIFIED | source: [client page URL]
   NO  \u2192 \u26a0\ufe0f REWRITE | note: \u201cNot confirmed on client website \u2014 remove or ask client to verify\u201d
         Do NOT substitute with an external source \u2014 that would be inventing client facts.

IF TRACK B \u2014 General/regulatory/research claim:
\u25ba STEP 1: Search TIER 1 independent sources
   FOUND, matches exactly      \u2192 \u2705 VERIFIED | source: [URL]
   FOUND, brief overstates it  \u2192 \u26a0\ufe0f REWRITE | correction: [exact correct finding] | source: [URL]
   NOT FOUND at TIER 1         \u2192 go to STEP 2

\u25ba STEP 2: Check brief\u2019s cited Sources section
   Source verifies the claim   \u2192 \u2705 VERIFIED | source: [URL]
   Source does NOT support it  \u2192 \u274c REMOVE (fabricated citation)
   Not in brief\u2019s sources      \u2192 \u274c REMOVE

\u25ba STEP 3: Fallback
   \u274c REMOVE. Provide a qualitative rewrite suggestion:
   e.g. \u201cReplace \u2018[specific number]\u2019 with \u2018verify the current figure with [authority]\u2019\u201d

`;

const before = txt.substring(0, startIdx);
const after = txt.substring(endIdx);
txt = before + NEW_PRIORITY_AND_TREE + after;
preFC.parameters.messages.message[0].content = txt;
console.log('\u2705 Pre-Draft Fact Checker: two-track priority chain applied');

// ─────────────────────────────────────────────────────────────────────────────
// 2. Verified Claims Parser — update source priority to match
// ─────────────────────────────────────────────────────────────────────────────

const vcp = wf.nodes.find(n => n.name === 'Verified Claims Parser');
const vcpStartMarker = '\u2501\u2501\u2501 SOURCE PRIORITY (use this when choosing which version of a claim to keep) \u2501\u2501\u2501';
const vcpEndMarker = '\u2501\u2501\u2501 DECISION LOGIC \u2014 APPLY TO EVERY MANIFEST ITEM \u2501\u2501\u2501';

let vcpTxt = vcp.parameters.text;
const vcpStart = vcpTxt.indexOf(vcpStartMarker);
const vcpEnd = vcpTxt.indexOf(vcpEndMarker);

if (vcpStart === -1 || vcpEnd === -1) {
    console.log('WARNING: VCP markers not found. vcpStart:', vcpStart, 'vcpEnd:', vcpEnd);
} else {
    const NEW_VCP_PRIORITY = `\u2501\u2501\u2501 SOURCE PRIORITY (use this when choosing which version of a claim to keep) \u2501\u2501\u2501

Two tracks \u2014 same logic as Pre-Draft Fact Checker:

CLIENT-SPECIFIC CLAIMS (services, credentials, team, programs, client-published stats):
  1. Client\u2019s own website (from Client Site Researcher) \u2014 HIGHEST AUTHORITY
     If the client published it, it is valid. Do not remove it because an external source disagrees.
  2. Sources the client cites on their own site
  3. If not found on client site \u2192 flag for removal or ask client to confirm

GENERAL / REGULATORY / RESEARCH CLAIMS (laws, named studies, org guidelines, industry stats):
  1. Independent primary source (.gov, .edu, peer-reviewed) \u2014 HIGHEST AUTHORITY
  2. Brief\u2019s cited Sources section (if fact-checker confirmed the URL checks out)
  3. If neither confirms \u2192 drop the specific, rewrite as qualitative

`;
    vcpTxt = vcpTxt.substring(0, vcpStart) + NEW_VCP_PRIORITY + vcpTxt.substring(vcpEnd);
    vcp.parameters.text = vcpTxt;
    console.log('\u2705 Verified Claims Parser: two-track priority applied');
}

// ─────────────────────────────────────────────────────────────────────────────
// Save + verify
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync('DEV Skywide Content (Word Count Fix).json', JSON.stringify(wf, null, 2));

const verify = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
const fcV = verify.nodes.find(n => n.name === 'Pre-Draft Fact Checker').parameters.messages.message[0].content;
const vcpV = verify.nodes.find(n => n.name === 'Verified Claims Parser').parameters.text;

console.log('');
console.log('\u2550'.repeat(55));
console.log('VERIFICATION');
console.log('\u2550'.repeat(55));
const checks = [
    ['FC: Track A/B split present',              fcV.includes('TRACK A')],
    ['FC: Client website TIER 1 for Track A',    fcV.includes('TIER 1 (Highest): Client')],
    ['FC: Independent sources TIER 1 for Track B', fcV.includes('TIER 1 (Highest): Independent')],
    ['FC: Do not override client identity',      fcV.includes('fact-checking their identity')],
    ['FC: Client-verified verdict format',       fcV.includes('CLIENT-VERIFIED')],
    ['VCP: Client website highest authority',    vcpV.includes('HIGHEST AUTHORITY')],
    ['VCP: Two-track note present',              vcpV.includes('Two tracks')],
    ['Node count stable at 47',                  verify.nodes.length === 47],
];
checks.forEach(([label, ok]) => console.log((ok ? '\u2705' : '\u274c') + ' ' + label));
const score = checks.filter(c => c[1]).length;
console.log('\nScore: ' + score + '/' + checks.length);
