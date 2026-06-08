const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

// 1. Fix QA Output Parsers
for (const node of wf.nodes) {
    if (node.name === 'Structured Output Parser1' || node.name === 'Structured Output Parser2') {
        if (node.parameters && node.parameters.jsonSchemaExample) {
            let schema = JSON.parse(node.parameters.jsonSchemaExample);
            // Fix "passed": "true" -> "passed": true
            if (schema.passed === "true" || schema.passed === "false") {
                schema.passed = schema.passed === "true";
                node.parameters.jsonSchemaExample = JSON.stringify(schema, null, 2);
                console.log(`Fixed schema for ${node.name}`);
            }
        }
    }
}

// 2. Create Output Parser for Verified Claims Parser
let hasVerifiedParser = wf.nodes.find(n => n.name === 'Verified Claims Output Parser');
if (!hasVerifiedParser) {
    const verifiedParser = {
        parameters: {
            jsonSchemaExample: "{\n  \"final_verified_claims\": [\n    {\n      \"claim\": \"string\",\n      \"verified_source_url\": \"string\"\n    }\n  ]\n}"
        },
        id: "verified-claims-output-parser",
        name: "Verified Claims Output Parser",
        type: "@n8n/n8n-nodes-langchain.outputParserStructured",
        typeVersion: 1.3,
        position: [ 619664, 154760 ]
    };
    wf.nodes.push(verifiedParser);
    wf.connections['Verified Claims Output Parser'] = {
        ai_outputParser: [ [ { node: 'Verified Claims Parser', type: 'ai_outputParser', index: 0 } ] ]
    };
    console.log('Added Verified Claims Output Parser.');
}

// 3. Create Output Parser for Claims Extractor & Manifest Generator
let hasExtractorParser = wf.nodes.find(n => n.name === 'Claims Extractor Output Parser');
if (!hasExtractorParser) {
    // Find the position of Claims Extractor & Manifest Generator
    let target = wf.nodes.find(n => n.name === 'Claims Extractor & Manifest Generator');
    let pos = target ? [target.position[0], target.position[1] - 200] : [0, 0];
    
    const extractorParser = {
        parameters: {
            jsonSchemaExample: "{\n  \"approved_claims\": [\n    \"string\"\n  ],\n  \"approved_statistics\": [\n    \"string\"\n  ],\n  \"forbidden_patterns\": [\n    \"string\"\n  ]\n}"
        },
        id: "claims-extractor-output-parser",
        name: "Claims Extractor Output Parser",
        type: "@n8n/n8n-nodes-langchain.outputParserStructured",
        typeVersion: 1.3,
        position: pos
    };
    wf.nodes.push(extractorParser);
    wf.connections['Claims Extractor Output Parser'] = {
        ai_outputParser: [ [ { node: 'Claims Extractor & Manifest Generator', type: 'ai_outputParser', index: 0 } ] ]
    };
    console.log('Added Claims Extractor Output Parser.');
}

// Ensure hasOutputParser is true on both target nodes
for (const node of wf.nodes) {
    if (node.name === 'Verified Claims Parser' || node.name === 'Claims Extractor & Manifest Generator') {
        if (!node.parameters) node.parameters = {};
        node.parameters.hasOutputParser = true;
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Successfully repaired all Output Parsers.');
