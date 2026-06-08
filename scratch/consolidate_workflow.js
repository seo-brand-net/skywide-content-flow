const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('scratch/workflow_max_tokens_fixed.json', 'utf8'));

// 1. Remove all disabled nodes (fixes the double export bug!)
const activeNodes = wf.nodes.filter(n => !n.disabled);
console.log(`Removed ${wf.nodes.length - activeNodes.length} disabled nodes.`);

// Clean up connections targeting disabled nodes
const newConnections = {};
for (const [source, targets] of Object.entries(wf.connections)) {
    // Only keep if the source node is still active
    if (!activeNodes.find(n => n.name === source)) continue;

    newConnections[source] = {};
    for (const [type, typeTargets] of Object.entries(targets)) {
        newConnections[source][type] = typeTargets.map(tArray => {
            return tArray.filter(t => activeNodes.find(n => n.name === t.node));
        });
    }
}

// 2. Add Claims Extractor Nodes
const extractorModel = {
  "parameters": { "model": "gpt-4o-mini", "options": { "temperature": 0 } },
  "id": "e4f8d9b1-a2c3-4d5e-b6f7-c8a9b0c1d2e3",
  "name": "Claims Extractor Model",
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "typeVersion": 1,
  "position": [ 800, 300 ]
};

const extractorChain = {
  "parameters": {
    "promptType": "define",
    "text": "=# The Claims Bouncer\n\nYou are a strict Claims Extractor for a content generation pipeline. Your job is to read the Creative Brief and the Client Website Data, and extract a strict allowlist of claims, statistics, and rules into a JSON Manifest.\n\n## Inputs\n**Creative Brief:**\n{{ $json.brief }}\n\n**Client Website Data:**\n{{ $json.website_text }}\n\n## Rules\n1. Extract every specific service offering, product feature, and factual claim requested in the Brief.\n2. Verify each claim against the Client Website Data. If the website does not support the claim, omit it or mark its source strictly as 'Brief'.\n3. Extract all statistics (e.g., '73% of people...').\n4. Generate a `forbidden_patterns` list containing typical AI hallucinated authority phrases you want the downstream nodes to avoid (e.g., 'practitioners consistently see', 'American Psychological Association', 'clinical experience shows').\n\nOutput STRICTLY in the provided JSON schema.",
    "hasOutputParser": true,
    "schemaType": "fromJson",
    "jsonSchema": "{\n  \"type\": \"object\",\n  \"properties\": {\n    \"approved_claims\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"type\": \"object\",\n        \"properties\": {\n          \"claim\": { \"type\": \"string\" },\n          \"source\": { \"type\": \"string\", \"enum\": [\"Website\", \"Brief\", \"Both\"] },\n          \"approved_wording\": { \"type\": \"string\" },\n          \"target_section\": { \"type\": \"string\", \"description\": \"Which H2 this belongs in\" }\n        },\n        \"required\": [\"claim\", \"source\", \"approved_wording\", \"target_section\"]\n      }\n    },\n    \"approved_statistics\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"type\": \"object\",\n        \"properties\": {\n          \"statistic\": { \"type\": \"string\" },\n          \"source\": { \"type\": \"string\" },\n          \"context\": { \"type\": \"string\" }\n        },\n        \"required\": [\"statistic\", \"source\", \"context\"]\n      }\n    },\n    \"forbidden_patterns\": {\n      \"type\": \"array\",\n      \"items\": { \"type\": \"string\" }\n    }\n  },\n  \"required\": [\"approved_claims\", \"approved_statistics\", \"forbidden_patterns\"]\n}"
  },
  "id": "f5e9c0a2-b3d4-4e5f-c7g8-d9b0c1d2e3f4",
  "name": "Claims Extractor & Manifest Generator",
  "type": "@n8n/n8n-nodes-langchain.chainLlm",
  "typeVersion": 1.4,
  "position": [ 800, 100 ]
};

activeNodes.push(extractorModel);
activeNodes.push(extractorChain);

// Connect Model to Extractor
newConnections["Claims Extractor Model"] = {
  "ai_languageModel": [ [ { "node": "Claims Extractor & Manifest Generator", "type": "ai_languageModel", "index": 0 } ] ]
};

// Wire it in: Client Profile Extractor -> Claims Extractor -> Pre-Draft Fact Checker
if (newConnections['Client Profile Extractor']) {
    newConnections['Client Profile Extractor']['main'] = [ [ { "node": "Claims Extractor & Manifest Generator", "type": "main", "index": 0 } ] ];
}
newConnections['Claims Extractor & Manifest Generator'] = {
    "main": [ [ { "node": "Pre-Draft Fact Checker", "type": "main", "index": 0 } ] ]
};

wf.nodes = activeNodes;
wf.connections = newConnections;

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Saved fully patched workflow to DEV_Skywide_Content_QA_Pipeline_Fixed.json');
