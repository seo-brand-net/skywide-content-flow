const fs = require('fs');

const inputPath = 'DEV Skywide Content (Word Count Fix).json';
const outputPath = 'DEV Skywide Content.json';

let wf;
try {
  wf = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// Ensure the webhook path is content-engine-dev
const whNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
if (whNode) {
    whNode.parameters.path = 'content-engine-dev';
    console.log('Confirmed Webhook path is content-engine-dev');
}

// Remove Sticky Notes
const beforeNodes = wf.nodes.length;
wf.nodes = wf.nodes.filter(n => n.type !== 'n8n-nodes-base.stickyNote');
console.log(`Removed ${beforeNodes - wf.nodes.length} Sticky Notes`);

// Update Workflow Name
wf.name = 'DEV Skywide Content';
console.log('Updated workflow name to DEV Skywide Content');

// Save to new file
fs.writeFileSync(outputPath, JSON.stringify(wf, null, 2));
console.log(`Successfully saved the clean DEV workflow to ${outputPath}`);
