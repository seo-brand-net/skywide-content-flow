const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

// Delete Merge3 completely
wf.nodes = wf.nodes.filter(n => n.name !== 'Merge3');
if (wf.connections['Merge3']) {
    delete wf.connections['Merge3'];
}

// Ensure QSI Bouncer exists. If not, add it.
let hasBouncer = wf.nodes.find(n => n.name === 'QSI Claims Verification Bouncer');
if (!hasBouncer) {
    const qsiModel = {
      parameters: { model: 'gpt-4o-mini', options: { temperature: 0 } },
      id: 'qsi-model-1234',
      name: 'QSI Bouncer Model',
      type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
      typeVersion: 1,
      position: [ 525800, 113400 ]
    };
    const qsiBouncer = {
      parameters: {
        promptType: 'define',
        text: "=# The QSI Bouncer\n\nYou are the final gatekeeper. Your job is to compare the Drafted Article against the strict Claims Manifest and DELETE any hallucinations, and strictly fix any attribution errors.\n\n## Inputs\n**Drafted Article:**\n{{ $json.draft }}\n\n**Approved Claims Manifest:**\n{{ $node[\"Claims Extractor & Manifest Generator\"].json.approved_claims }}\n{{ $node[\"Claims Extractor & Manifest Generator\"].json.approved_statistics }}\n\n## Rules\n1. Scan the Drafted Article for any factual claims, statistics, percentages, or appeals to authority (e.g., 'The APA says...', 'Practitioners see...').\n2. **ATTRIBUTION FIX:** If the AI attributed a fact to the wrong source (like inventing APA guidelines) or used vague practitioner language, you must rewrite the sentence to cite the correct source from the manifest (or remove the fake source completely if none is provided).\n3. If you find a claim/stat that is NOT explicitly approved in the Claims Manifest, you must DELETE IT from the article completely. Rewrite the surrounding sentences so the paragraph still flows perfectly.\n4. Return the fully cleaned, sanitized article.\n\n**CREATIVE BYPASS RULE:** If the Approved Claims Manifest arrays are completely empty (`[]`), this means the brief is purely creative and does not require strict fact enforcement. In this case, allow general statements to remain, but STILL delete any highly specific hallucinated statistics or fake authority quotes (like fake APA guidelines).",
        hasOutputParser: false
      },
      id: 'qsi-bouncer-5678',
      name: 'QSI Claims Verification Bouncer',
      type: '@n8n/n8n-nodes-langchain.chainLlm',
      typeVersion: 1.4,
      position: [ 525800, 113200 ]
    };
    wf.nodes.push(qsiModel);
    wf.nodes.push(qsiBouncer);
    wf.connections['QSI Bouncer Model'] = { ai_languageModel: [ [ { node: 'QSI Claims Verification Bouncer', type: 'ai_languageModel', index: 0 } ] ] };
    console.log('Injected QSI Bouncer nodes.');
}

// Wire: Claude Draft -> QSI Bouncer -> Data Check & Research Gaps1
wf.connections['Claude Draft (Claude Opus 3)1'] = {
    main: [ [ { node: 'QSI Claims Verification Bouncer', type: 'main', index: 0 } ] ]
};
wf.connections['QSI Claims Verification Bouncer'] = {
    main: [ [ { node: 'Data Check & Research Gaps1', type: 'main', index: 0 } ] ]
};

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Fixed Merge3 block and fully wired QSI Bouncer.');
