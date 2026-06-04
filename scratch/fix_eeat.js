const fs = require('fs');
const file = 'DEV Skywide Content (Word Count Fix).json';
let wf = JSON.parse(fs.readFileSync(file, 'utf8'));

const eeatNode = wf.nodes.find(n => n.name === 'Claude EEAT Injection1');
const msgArr = eeatNode?.parameters?.messages?.messageValues;
const msg = msgArr?.[msgArr.length - 1];

if (!msg || typeof msg.message !== 'string') {
    console.log('ERROR: Could not find EEAT message');
    process.exit(1);
}

if (msg.message.includes('EEAT ANTI-HALLUCINATION')) {
    console.log('Already patched — skipping');
    process.exit(0);
}

// Inject the anti-hallucination block right before the actual article content section
// The EEAT node receives the article and must return it enhanced
// We inject the rules at the top of the prompt after the CRITICAL word count line

const insertAfter = 'When adding EEAT elements, condense or replace existing content to maintain length.';
const idx = msg.message.indexOf(insertAfter);

const antiHallucinationBlock = `

# ⛔ EEAT ANTI-HALLUCINATION PROTOCOL (NON-NEGOTIABLE)

Your job is to ENHANCE the existing article with EEAT signals — NOT to invent new facts.

RULE 1 — NO NEW STATISTICS: Do NOT introduce any percentage, number, multiplier, or precision figure that is not already in the article you received. If a statistic would strengthen a point, express it qualitatively instead (e.g. "many families report..." not "67% of families report...").

RULE 2 — NO INVENTED RESEARCH CITATIONS: Do NOT add phrases like "research spanning X years", "studies show", "longitudinal research shows", "university autism centers show", "clinical data confirms", or similar unless the specific study/source is already named in the article. Vague authority laundering is worse than no citation.

RULE 3 — NO INVENTED INSTITUTIONAL REFERENCES: Do NOT fabricate references to "thousands of treatment centers", "autism research centers", "clinical experience across programs", or similar. These sound authoritative but are invented.

RULE 4 — CLIENT FACTS ONLY: The only client-specific claims you may add or strengthen are those already present in the article. Do not invent new service names, credentials, accreditations, or program names.

RULE 5 — EEAT THROUGH STRUCTURE, NOT FABRICATION: Demonstrate EEAT by:
  ✅ Sharpening existing expert explanations to sound more precise and confident
  ✅ Adding "here's why this matters" commentary on existing facts
  ✅ Improving the author's voice to sound more experienced and authoritative
  ✅ Tightening hedged language ("might help" → "helps") where already supported
  ✅ Adding brief real-world scenarios or examples that illustrate existing claims
  ✅ Referencing named organisations (APA, BACB, U.S. Surgeon General) ONLY if already mentioned in the article

RULE 6 — REVIEW BEFORE SUBMITTING: Read your output. If you spot a statistic, percentage, or research citation that was not in the article you received, delete it before submitting.

`;

if (idx !== -1) {
    const insertPoint = idx + insertAfter.length;
    msg.message = msg.message.slice(0, insertPoint) + antiHallucinationBlock + msg.message.slice(insertPoint);
    console.log('✅ Anti-hallucination block injected into EEAT prompt');
} else {
    // Fallback: prepend to the message
    msg.message = antiHallucinationBlock + msg.message;
    console.log('✅ Anti-hallucination block prepended to EEAT prompt (insert marker not found)');
}

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('Saved locally. Ready to push.');
