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
    san4.parameters.messages.values.forEach(v => {
        if (v.content && v.content.includes('FINAL REQUIREMENT: APPEND FACT CHECKS')) {
            v.content = v.content.replace(/\\n\\n## FINAL REQUIREMENT: APPEND FACT CHECKS[\\s\\S]*?\}\}/g, '');
        }
    });
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Successfully reverted Document Export Sanitization4 prompt.');
