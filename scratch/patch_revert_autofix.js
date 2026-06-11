const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// Revert autoFix to false for all output parsers
let patchedCount = 0;
wf.nodes.forEach(n => {
  if (n.type === '@n8n/n8n-nodes-langchain.outputParserStructured') {
    if (n.parameters.autoFix === true) {
      n.parameters.autoFix = false;
      patchedCount++;
      console.log(`Reverted autoFix for node: ${n.name}`);
    }
    
    // Also, if the model outputs something that isn't matching the strict inferred types, 
    // it's best to use strings for properties in the schema example.
    if (n.parameters.jsonSchemaExample) {
       // Convert 'true' to '"boolean"' and other specific strings to generic types
       let schema = n.parameters.jsonSchemaExample;
       if (n.name === 'Claims Extractor Output Parser') {
           schema = schema.replace(/"requires_verification": true/g, '"requires_verification": "boolean"');
           n.parameters.jsonSchemaExample = schema;
           console.log(`Relaxed schema for ${n.name}`);
       }
       if (n.name === 'Verified Claims Output Parser') {
           schema = schema.replace(/"verified": true/g, '"verified": "boolean"');
           n.parameters.jsonSchemaExample = schema;
           console.log(`Relaxed schema for ${n.name}`);
       }
    }
  }
});

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Reverted autoFix and relaxed schemas.');
