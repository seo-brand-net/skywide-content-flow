const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// 1. Fix Claims Extractor Prompt
const extractorNode = wf.nodes.find(n => n.name === 'Claims Extractor & Manifest Generator');
if (extractorNode) {
    let pStr = extractorNode.parameters.text;
    
    // Remove the conflicting anti-markdown instructions
    pStr = pStr.replace(/CRITICAL: Return ONLY raw, valid JSON\. Do NOT wrap your response in markdown code blocks\./g, '');
    pStr = pStr.replace(/Do NOT wrap your response in markdown code blocks\./g, '');
    
    extractorNode.parameters.text = pStr;
    console.log('Fixed Claims Extractor prompt.');
}

// 2. Fix Claims Extractor Output Parser Schema
const parserNode = wf.nodes.find(n => n.name === 'Claims Extractor Output Parser');
if (parserNode) {
    const newSchema = {
      "placement_manifest": [
        {
          "target_section": "H2 section heading this claim belongs to",
          "claim_text": "The exact claim, statistic, citation, or link text to include",
          "placement_instruction": "Exact instruction from the brief",
          "source": "Brief | Website | Both | Brief-Cited-Source",
          "claim_type": "statistic | citation | regulation | credential | internal_link | org_attribution | named_expert | client_stat | general_citation",
          "requires_verification": "boolean"
        }
      ],
      "forbidden_patterns": [
        "string"
      ]
    };
    
    parserNode.parameters.jsonSchemaExample = JSON.stringify(newSchema, null, 2);
    console.log('Fixed Claims Extractor Output Parser schema.');
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Successfully aligned prompt and schema!');
