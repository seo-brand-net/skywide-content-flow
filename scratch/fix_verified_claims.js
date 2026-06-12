const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const signalNode = wf.nodes.find(n => n.name === 'Signal Completion (Update a document17)');
if (signalNode) {
    let jsonBody = signalNode.parameters.jsonBody;
    
    // Fix Pre-Draft Fact Checker expression
    jsonBody = jsonBody.replace(/\$\('Pre-Draft Fact Checker'\)\.first\(\)\?\.json\?\.message\?\.content/g, "$('Pre-Draft Fact Checker').first()?.json?.choices[0]?.message?.content");
    
    // Fix Post-Draft Fact Checker expression
    jsonBody = jsonBody.replace(/\$\('Post-Draft Fact Checker'\)\.first\(\)\?\.json\?\.message\?\.content/g, "$('Post-Draft Fact Checker').first()?.json?.choices[0]?.message?.content");

    signalNode.parameters.jsonBody = jsonBody;
    
    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log('Successfully updated the verified_claims expressions in Signal Completion.');
} else {
    console.log('Signal Completion node not found.');
}
