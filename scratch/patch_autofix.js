const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

let patchedCount = 0;
wf.nodes.forEach(n => {
  if (n.type === '@n8n/n8n-nodes-langchain.outputParserStructured') {
    if (n.parameters.autoFix === false || n.parameters.autoFix === undefined) {
      n.parameters.autoFix = true;
      console.log(`Enabled autoFix for node: ${n.name}`);
      patchedCount++;
    }
  }
});

if (patchedCount > 0) {
  fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
  console.log('Saved patched workflow with autoFix enabled.');
} else {
  console.log('No nodes needed patching.');
}
