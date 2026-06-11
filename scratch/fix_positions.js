const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// Client Profile Extractor is at [2600, 680]
// Verified Claims Parser is at [3700, 0]
// We will place the Claims Extractor nodes around [3000, 200]

const extractor = wf.nodes.find(n => n.name === 'Claims Extractor & Manifest Generator');
if (extractor) {
    extractor.position = [3000, 200];
}

const parser = wf.nodes.find(n => n.name === 'Claims Extractor Output Parser');
if (parser) {
    // Usually Output Parsers are placed directly below or above the node
    parser.position = [3000, 400];
}

const model = wf.nodes.find(n => n.name === 'Claims Extractor Model');
if (model) {
    // Models are usually placed nearby too
    model.position = [3000, 0];
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Fixed node positions to be near the rest of the workflow.');
