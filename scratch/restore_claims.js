const fs = require('fs');

const backupPath = 'DEV Skywide  Content.json'; // using the exact filename
const targetPath = 'DEV Skywide Content (Word Count Fix).json';

let backupWf, targetWf;
try {
  backupWf = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  targetWf = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const sourceExtractor = backupWf.nodes.find(n => n.name === 'Claims Extractor & Manifest Generator');
const sourceParser = backupWf.nodes.find(n => n.name === 'Claims Extractor Output Parser');

if (!sourceExtractor || !sourceParser) {
    console.error('Could not find source nodes in backup.');
    process.exit(1);
}

const targetExtractorIdx = targetWf.nodes.findIndex(n => n.name === 'Claims Extractor & Manifest Generator');
const targetParserIdx = targetWf.nodes.findIndex(n => n.name === 'Claims Extractor Output Parser');

if (targetExtractorIdx !== -1) {
    targetWf.nodes[targetExtractorIdx] = sourceExtractor;
    console.log('Replaced Claims Extractor & Manifest Generator');
}

if (targetParserIdx !== -1) {
    targetWf.nodes[targetParserIdx] = sourceParser;
    console.log('Replaced Claims Extractor Output Parser');
}

fs.writeFileSync(targetPath, JSON.stringify(targetWf, null, 2));
console.log('Successfully restored Claims Extractor nodes from backup.');
