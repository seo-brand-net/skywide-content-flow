const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

// 1. Remove Post-Draft Fact Checker
wf.nodes = wf.nodes.filter(n => n.name !== 'Post-Draft Fact Checker');

// Reroute whatever went to Post-Draft Fact Checker directly to Claude Keyword Check + Semantic Gap1
let rewired = false;
for (const [source, targets] of Object.entries(wf.connections)) {
    if (targets.main && targets.main[0]) {
        for (let i = 0; i < targets.main[0].length; i++) {
            if (targets.main[0][i].node === 'Post-Draft Fact Checker') {
                targets.main[0][i].node = 'Claude Keyword Check + Semantic Gap1';
                rewired = true;
                console.log(`Rewired ${source} directly to Claude Keyword Check`);
            }
        }
    }
}
delete wf.connections['Post-Draft Fact Checker'];

// 2. Add Verified Claims Parser Node between Pre-Draft Fact Checker and Keyword Strategist
const parserModel = {
  parameters: { model: 'gpt-4o-mini', options: { temperature: 0 } },
  id: 'verified-parser-model',
  name: 'Verified Parser Model',
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  typeVersion: 1,
  position: [ 525300, 113400 ]
};

const parserNode = {
  parameters: {
    promptType: 'define',
    text: "=# Verified Claims Parser\n\nYou will receive a raw Fact-Check Report containing claims that have been verified or rejected by a web researcher.\n\nYour ONLY job is to parse this report and output a clean JSON array containing ONLY the claims marked as ✅ VERIFIED. Discard any claims marked as ❌ REMOVE.\n\n## Inputs\n**Fact-Check Report:**\n{{ $json.message.content || $json.text || $json.output }}\n\nOutput STRICTLY in the provided JSON schema.",
    hasOutputParser: true,
    schemaType: 'fromJson',
    jsonSchema: "{\n  \"type\": \"object\",\n  \"properties\": {\n    \"final_verified_claims\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"type\": \"object\",\n        \"properties\": {\n          \"claim\": { \"type\": \"string\" },\n          \"verified_source_url\": { \"type\": \"string\" }\n        }\n      }\n    }\n  },\n  \"required\": [\"final_verified_claims\"]\n}"
  },
  id: 'verified-claims-parser',
  name: 'Verified Claims Parser',
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  typeVersion: 1.4,
  position: [ 525300, 113200 ]
};

wf.nodes.push(parserModel);
wf.nodes.push(parserNode);
wf.connections['Verified Parser Model'] = { ai_languageModel: [ [ { node: 'Verified Claims Parser', type: 'ai_languageModel', index: 0 } ] ] };

// Wire: Pre-Draft Fact Checker -> Verified Claims Parser -> Keyword Strategist
if (wf.connections['Pre-Draft Fact Checker']) {
    wf.connections['Pre-Draft Fact Checker']['main'] = [ [ { node: 'Verified Claims Parser', type: 'main', index: 0 } ] ];
}
wf.connections['Verified Claims Parser'] = {
    main: [ [ { node: 'Keyword Strategist', type: 'main', index: 0 } ] ]
};

// 3. Update Draft and Bouncer nodes to reference the new Verified Claims Parser
for (const node of wf.nodes) {
    if (node.name === 'Claude Draft (Claude Opus 3)1' || node.name === 'QSI Claims Verification Bouncer') {
        if (node.parameters && node.parameters.text) {
            node.parameters.text = node.parameters.text.replace(
                /\{\{ JSON\.stringify\(\$\('Claims Extractor & Manifest Generator'\)\.first\(\)\.json\.output \|\| \$\('Claims Extractor & Manifest Generator'\)\.first\(\)\.json\) \}\}/g,
                "{{ JSON.stringify($('Verified Claims Parser').first().json.output || $('Verified Claims Parser').first().json) }}"
            );
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Removed Post-Draft Fact Checker and added Verified Claims Parser.');
