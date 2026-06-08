const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

for (const node of wf.nodes) {

    // 1. Update Claims Extractor prompt to extract placement-aware manifest
    if (node.name === 'Claims Extractor & Manifest Generator') {
        node.parameters.text = `=# Claims & Placement Manifest Generator

You are a strict editorial analyst. Your job is to read the Creative Brief and the Client Website Data, then produce a PLACEMENT-AWARE Claims Manifest.

This manifest will be handed directly to an AI writer. Each claim must include EXACTLY which section of the article it belongs to, so the writer knows precisely where to place it — no guessing allowed.

## Inputs
**Creative Brief:**
{{ $('Webhook1').first().json.body.creative_brief || 'No Brief Provided' }}

**Client Website Data:**
{{ JSON.stringify($json) }}

## Instructions
1. Read the brief's SECTION-BY-SECTION OUTLINE carefully. 
2. For each section in the outline, extract every claim, statistic, citation, or internal link that the brief explicitly instructs to place in that section.
3. Also extract any statistics or facts from the Client Website Data that are relevant to that section.
4. Each item in the manifest must include: the exact text of the claim/fact/link, the target section H2 heading, and the source (Brief, Website, or Both).
5. Also generate a forbidden_patterns list of AI hallucination phrases to avoid.

Output STRICTLY in the provided JSON schema.
CRITICAL: Return ONLY raw, valid JSON. Do NOT wrap your response in markdown code blocks. Do NOT add any conversational text.
You must return a valid JSON object.`;

        console.log('Updated Claims Extractor prompt.');
    }

    // 2. Update Claims Extractor Output Parser schema to placement-aware structure
    if (node.name === 'Claims Extractor Output Parser') {
        node.parameters.jsonSchemaExample = JSON.stringify({
            "placement_manifest": [
                {
                    "section": "H2 section heading this claim belongs to",
                    "claim": "The exact claim, statistic, citation, or link text to include",
                    "source": "Brief | Website | Both",
                    "placement_instruction": "Exact instruction from the brief (e.g. cite Cleveland Clinic here, link to young adult treatment page)"
                }
            ],
            "forbidden_patterns": [
                "string"
            ]
        }, null, 2);

        console.log('Updated Claims Extractor Output Parser schema.');
    }
}

// 3. Now inject the placement manifest into Claude Draft in a strict, non-ignorable block
for (const node of wf.nodes) {
    if (node.name === 'Claude Draft (Claude Opus 3)1') {
        if (node.parameters && node.parameters.messages && node.parameters.messages.messageValues) {
            let msg = node.parameters.messages.messageValues[0].message;

            // Remove old flat claims injection if it exists
            msg = msg.replace(/# CLAIMS MANIFEST[\s\S]*?═══+\n/g, '');

            // Inject the new placement-aware block right before the Anti-Hallucination Protocol
            const injectionBlock = `
# ═══ MANDATORY CLAIMS & PLACEMENT MANIFEST ═══
The following manifest has been extracted directly from the Creative Brief and Client Website.
Each item specifies EXACTLY which section of the article it must appear in.
You are REQUIRED to place every single item from this manifest in its specified section. No omissions.

{{ JSON.stringify($('Claims Extractor & Manifest Generator').first().json.output.placement_manifest) }}

ENFORCEMENT RULE: Before finalizing the article, scan each H2 section and verify every manifest item for that section has been included. If any are missing, add them before submitting.
# ══════════════════════════════════════════════

`;
            // Inject before the Anti-Hallucination Protocol block
            if (msg.includes('# ⛔ ANTI-HALLUCINATION PROTOCOL')) {
                msg = msg.replace('# ⛔ ANTI-HALLUCINATION PROTOCOL', injectionBlock + '# ⛔ ANTI-HALLUCINATION PROTOCOL');
                node.parameters.messages.messageValues[0].message = msg;
                console.log('Injected placement manifest block into Claude Draft.');
            }
        }
    }

    // 4. Also inject forbidden_patterns into the Anti-Hallucination block in Claude Draft
    // Already handled by the manifest above

    // 5. Update Verified Claims Parser to use the new placement-aware output schema
    if (node.name === 'Verified Claims Output Parser') {
        node.parameters.jsonSchemaExample = JSON.stringify({
            "verified_placement_manifest": [
                {
                    "section": "H2 section heading this claim belongs to",
                    "claim": "The exact verified claim text",
                    "verified_source_url": "URL from Perplexity verification"
                }
            ]
        }, null, 2);
        console.log('Updated Verified Claims Output Parser schema.');
    }

    // 6. Update Verified Claims Parser prompt to use the placement-aware structure
    if (node.name === 'Verified Claims Parser') {
        node.parameters.text = `=# Verified Claims Parser

You will receive a raw Fact-Check Report from a web researcher containing claims that have been verified or rejected.

You will also receive the original Claims Placement Manifest.

Your ONLY job is to cross-reference the two and output a clean verified manifest where:
- Claims marked as VERIFIED get their verified_source_url populated
- Claims marked as REMOVED or UNVERIFIABLE are dropped
- Each claim retains its section placement so the writer knows where to use it

## Inputs
**Fact-Check Report:**
{{ $('Pre-Draft Fact Checker').first().json.choices[0].message.content }}

**Original Placement Manifest:**
{{ JSON.stringify($('Claims Extractor & Manifest Generator').first().json.output.placement_manifest) }}

Output STRICTLY in the provided JSON schema containing a verified_placement_manifest array.
CRITICAL: Return ONLY raw, valid JSON. Do NOT wrap your response in markdown code blocks.
You must return a valid JSON object.`;

        console.log('Updated Verified Claims Parser prompt.');
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('\nAll changes written. Placement-aware manifest system is active.');
