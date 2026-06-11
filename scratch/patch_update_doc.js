const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const n = wf.nodes.find(n => n.name === 'Update a document17');
if (n && n.parameters && n.parameters.actionsUi && n.parameters.actionsUi.actionFields) {
    const fields = n.parameters.actionsUi.actionFields;
    for (let i = 0; i < fields.length; i++) {
        if (fields[i].text) {
            // Replace the entire block that references the missing nodes
            fields[i].text = `={{ $('Document Export Sanitization5').first().json.text || $('Document Export Sanitization5').first().json.data || $('Document Export Sanitization5').first().json.message?.content || 'Error: Could not retrieve output' }}`;
        }
    }
    
    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log('Successfully patched Update a document17 to remove missing node references.');
} else {
    console.log('Could not find Update a document17 or its actions parameters.');
}
