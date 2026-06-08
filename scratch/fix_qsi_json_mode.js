const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

for (const node of wf.nodes) {
    if (node.name === 'QSI Bouncer Model') {
        if (node.parameters && node.parameters.options) {
            delete node.parameters.options.responseFormat;
            console.log('Disabled json_object mode on QSI Bouncer Model (it should return text).');
        }
    }
    
    // Just to be absolutely safe, let's make sure the other models that DO use json_object 
    // have the word "JSON" explicitly injected into the prompt of their parent nodes.
    if (node.name === 'AI Agent1' || node.name === 'AI Agent2' || node.name === 'QA Agent' || node.name === 'Claims Extractor & Manifest Generator' || node.name === 'Verified Claims Parser') {
        if (node.parameters && node.parameters.text) {
             if (!node.parameters.text.toLowerCase().includes('json')) {
                 node.parameters.text += '\n\nYou must return a valid JSON object.';
                 console.log('Added "JSON" keyword to', node.name);
             }
        }
        if (node.parameters && node.parameters.options && node.parameters.options.systemMessage) {
             if (!node.parameters.options.systemMessage.toLowerCase().includes('json')) {
                 node.parameters.options.systemMessage += '\n\nYou must return a valid JSON object.';
                 console.log('Added "JSON" keyword to', node.name, 'systemMessage');
             }
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
