const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

const draftAppend = `\n\n## CLAIMS MANIFEST (STRICT ENFORCEMENT)\nYou have been provided with a strict Claims Manifest from the Bouncer node:\n{{ $node["Claims Extractor & Manifest Generator"].json.approved_claims }}\n{{ $node["Claims Extractor & Manifest Generator"].json.approved_statistics }}\n\nYou MUST obey these rules:\n1. You may ONLY use statistics and factual claims if they are explicitly listed in the arrays above.\n2. DO NOT invent any new claims, statistics, or services.\n3. DO NOT use any phrasing found in the forbidden_patterns list.`;

const eeatAppend = `\n\n## STRICT NEGATIVE CONSTRAINTS (EEAT BOUNDARIES)\n1. DO NOT ADD ANY NEW FACTUAL CLAIMS, STATISTICS, OR PERCENTAGES. Your job is ONLY to improve the structural and tonal authority of the existing text.\n2. DO NOT INVENT QUOTES, GUIDELINES, OR NAMED/UNNAMED PRACTITIONERS.\n3. DO NOT use vague authority phrases like "clinical experience shows" or "experts agree".`;

// Fix the QSI Bouncer prompt to address attribution
for (const node of wf.nodes) {
    if (node.name === 'Claude Draft (Claude Opus 3)1') {
        if (node.parameters && node.parameters.text) {
            node.parameters.text += draftAppend;
        }
    }
    if (node.name === 'Claude EEAT Injection1') {
        if (node.parameters && node.parameters.text) {
            node.parameters.text += eeatAppend;
        }
    }
    if (node.name === 'QSI Claims Verification Bouncer') {
        node.parameters.text = "=# The QSI Bouncer\n\nYou are the final gatekeeper. Your job is to compare the Drafted Article against the strict Claims Manifest and DELETE any hallucinations, and strictly fix any attribution errors.\n\n## Inputs\n**Drafted Article:**\n{{ $json.draft }}\n\n**Approved Claims Manifest:**\n{{ $node[\"Claims Extractor & Manifest Generator\"].json.approved_claims }}\n{{ $node[\"Claims Extractor & Manifest Generator\"].json.approved_statistics }}\n\n## Rules\n1. Scan the Drafted Article for any factual claims, statistics, percentages, or appeals to authority (e.g., 'The APA says...', 'Practitioners see...').\n2. **ATTRIBUTION FIX:** If the AI attributed a fact to the wrong source (like inventing APA guidelines) or used vague practitioner language, you must rewrite the sentence to cite the correct source from the manifest (or remove the fake source completely if none is provided).\n3. If you find a claim/stat that is NOT explicitly approved in the Claims Manifest, you must DELETE IT from the article completely. Rewrite the surrounding sentences so the paragraph still flows perfectly.\n4. Return the fully cleaned, sanitized article.";
    }
}

// Ensure the QSI Bouncer node is correctly positioned in the connections
// Wire it: Claude Draft -> QSI Bouncer -> Claude Apply Recommendations -> Claude EEAT Injection
// Let's just make sure the Bouncer is injected into the JSON.
// (I injected it previously, but let's just confirm we update its prompt).

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Appended prompts to Draft and EEAT, and updated QSI Bouncer prompt for attribution.');
