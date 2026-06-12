const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const san4 = wf.nodes.find(n => n.name === 'Document Export Sanitization4');
if (san4 && san4.parameters.messages && san4.parameters.messages.values) {
    let content = san4.parameters.messages.values[1].content;
    
    // Use regex to remove the FINAL REQUIREMENT section
    content = content.replace(/## FINAL REQUIREMENT: APPEND FACT CHECKS[\s\S]+/, '');
    
    san4.parameters.messages.values[1].content = content.trim();
    
    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log('Successfully removed the Verified Claims appending instruction from Document Export Sanitization4.');
} else {
    console.log('Document Export Sanitization4 node not found.');
}
