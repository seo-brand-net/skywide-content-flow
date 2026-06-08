const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

const antiMarkdownRule = "\n\nCRITICAL: Return ONLY raw, valid JSON. Do NOT wrap your response in markdown code blocks (```json). Do NOT add any conversational text.";

for (const node of wf.nodes) {
    if (node.name === 'Claims Extractor & Manifest Generator' || 
        node.name.includes('AI Agent') || 
        node.name === 'QA Agent' || 
        node.name === 'AI Agent1' || 
        node.name === 'AI Agent2') {
        
        // Find if this node is connected to a Structured Output Parser
        let hasParser = false;
        if (node.parameters && node.parameters.hasOutputParser) hasParser = true;
        
        // Let's also just check if the node's text asks for JSON.
        if (node.parameters && node.parameters.text) {
            if (!node.parameters.text.includes('NO MARKDOWN') && !node.parameters.text.includes('CRITICAL: Return ONLY raw, valid JSON')) {
                node.parameters.text += antiMarkdownRule;
                console.log('Injected anti-markdown rule into:', node.name, '(text)');
            }
        }
        
        // Some Agent nodes use 'prompt' or 'systemMessage' or something else
        if (node.parameters && node.parameters.options && node.parameters.options.systemMessage) {
            if (!node.parameters.options.systemMessage.includes('NO MARKDOWN') && !node.parameters.options.systemMessage.includes('CRITICAL: Return ONLY raw, valid JSON')) {
                node.parameters.options.systemMessage += antiMarkdownRule;
                console.log('Injected anti-markdown rule into:', node.name, '(systemMessage)');
            }
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Successfully applied strict anti-markdown rules to the remaining Structured Output nodes.');
