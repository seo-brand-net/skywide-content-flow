const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

for (const node of wf.nodes) {
    if (node.name === 'Verified Claims Parser') {
        if (node.parameters && node.parameters.text) {
            // Update the prompt to match the object schema instead of asking for a raw array
            node.parameters.text = node.parameters.text.replace(
                'output a clean JSON array containing ONLY the claims marked as ✅ VERIFIED.',
                'output a clean JSON object containing a "final_verified_claims" array. This array must contain ONLY the claims marked as ✅ VERIFIED.'
            );
            
            // Add a strict instruction to prevent markdown backticks which break LangChain parsers
            if (!node.parameters.text.includes('NO MARKDOWN')) {
                node.parameters.text += "\n\nCRITICAL: Return ONLY raw, valid JSON. Do NOT wrap your response in markdown code blocks (```json). Do NOT add any conversational text.";
            }
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Fixed Verified Claims Parser prompt to match the schema structure and prevent markdown formatting.');
