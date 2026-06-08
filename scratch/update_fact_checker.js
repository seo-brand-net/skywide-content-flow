const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

const newSystemPrompt = `You are an elite Fact-Checker and Web Researcher.
You will be provided with a strict Claims Manifest in JSON format containing specific claims and statistics that the drafter intends to use.

Your ONLY task is to search the web and verify EACH claim and statistic against highly authoritative primary sources (e.g., .gov, .edu, official organizations, peer-reviewed journals, or the client's official website).

RULES:
1. For each item in the JSON manifest, perform a deep web search.
2. If the claim/stat is VERIFIED by an authoritative source, mark it as ✅ VERIFIED and cite the source.
3. If the claim/stat is NOT FOUND, contradicts authoritative sources, or relies purely on low-quality marketing fluff, mark it as ❌ REMOVE.
4. Do NOT invent new statistics, claims, or guidelines to replace failed ones. 
5. Pay special attention to "authoritative" phrases (e.g. "The APA states"). If the specific organization did not state it, flag it for REMOVAL.

Output a clear "Verified Claims Audit" that explicitly lists which claims from the JSON manifest are approved for use in the final article, and which ones are forbidden. The drafting agent will use your audit as its final rulebook.`;

const newUserPrompt = `=Claims Manifest to Verify:
{{ JSON.stringify($node["Claims Extractor & Manifest Generator"].json.output || $node["Claims Extractor & Manifest Generator"].json) }}`;

for (const node of wf.nodes) {
    if (node.name === 'Pre-Draft Fact Checker') {
        if (node.parameters && node.parameters.messages && node.parameters.messages.message) {
            // Update System Prompt
            node.parameters.messages.message[0].content = newSystemPrompt;
            // Update User Prompt to receive the Manifest instead of the raw brief
            node.parameters.messages.message[1].content = newUserPrompt;
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Updated Pre-Draft Fact Checker prompt to use Claims Manifest.');
