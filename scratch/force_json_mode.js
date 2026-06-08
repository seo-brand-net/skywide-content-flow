const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

for (const node of wf.nodes) {
    if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
        // Only target models that feed into parsers or extractors
        if (node.name === 'Verified Parser Model' || node.name === 'Claims Extractor Model' || node.name === 'QA Agent Model' || node.name.includes('Model')) {
            if (!node.parameters) node.parameters = {};
            if (!node.parameters.options) node.parameters.options = {};
            
            // Force JSON object mode to prevent markdown backticks and unstructured output
            node.parameters.options.responseFormat = 'json_object';
            console.log('Enabled JSON responseFormat for:', node.name);
        }
    }
    
    // Also, relax the anti-markdown prompt just in case OpenAI json_object mode requires "JSON" explicitly in the prompt
    if (node.name === 'Verified Claims Parser' || node.name === 'Claims Extractor & Manifest Generator') {
        if (node.parameters && node.parameters.text) {
             node.parameters.text += '\n\nYou must return a valid JSON object.';
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Successfully enforced JSON output mode on models.');
