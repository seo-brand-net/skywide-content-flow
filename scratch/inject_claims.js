const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// 1. Update Signal Completion DB payload
const sigComp = wf.nodes.find(n => n.name.includes('Signal Completion'));
if (sigComp) {
    sigComp.parameters.jsonBody = `={{ {
  "request_id": $('Webhook1').first().json.body.request_id,
  "run_id": $('Webhook1').first().json.body.run_id,
  "webhook_response": $('Create folder1').isExecuted ? "https://drive.google.com/drive/u/0/folders/" + $('Create folder1').first().json.id : '',
  "raw_content": $('Document Export Sanitization4').first().json.message.content,
  "verified_claims": "--- PRE-DRAFT FACT CHECK ---\\n" + ($('Pre-Draft Fact Checker').first().json.message.content || '') + "\\n\\n--- POST-DRAFT FACT CHECK ---\\n" + ($('Post-Draft Fact Checker').first().json.message.content || '')
} }}`;
}

// 2. Update Document Export Sanitization4 to append the claims to the document
const san4 = wf.nodes.find(n => n.name === 'Document Export Sanitization4');
if (san4 && san4.parameters.messages && san4.parameters.messages.values) {
    // We target the second message (index 1) which is usually the user message
    const userMsgIndex = san4.parameters.messages.values.length > 1 ? 1 : 0;
    
    const appendInstruction = `\n\n## FINAL REQUIREMENT: APPEND FACT CHECKS\nAt the very bottom of the document (after the CTA), you MUST append a new section exactly titled "## 🔍 Verified Claims & Fact Checks".\nUnder this heading, output the following verification data exactly:\n\n{{ $('Post-Draft Fact Checker').first().json.message.content }}`;
    
    if (!san4.parameters.messages.values[userMsgIndex].content.includes('FINAL REQUIREMENT: APPEND FACT CHECKS')) {
        san4.parameters.messages.values[userMsgIndex].content += appendInstruction;
    }
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Successfully added verified claims to DB payload and Document Export output.');
