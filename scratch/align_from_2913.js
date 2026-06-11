const fs = require('fs');

const backupPath = 'DEV Skywide Content (Word Count Fix) CLEANUP-V2 2026-06-08T09-46-18.json';
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

const targetExtractorIdx = targetWf.nodes.findIndex(n => n.name === 'Claims Extractor & Manifest Generator');
const targetParserIdx = targetWf.nodes.findIndex(n => n.name === 'Claims Extractor Output Parser');

if (targetExtractorIdx !== -1 && sourceExtractor) {
    // Modify the source prompt to remove the markdown conflict
    let pStr = sourceExtractor.parameters.text;
    pStr = pStr.replace(/CRITICAL: Return ONLY raw, valid JSON\. Do NOT wrap your response in markdown code blocks\./g, '');
    pStr = pStr.replace(/Do NOT wrap your response in markdown code blocks\./g, '');
    sourceExtractor.parameters.text = pStr;
    
    // Copy but keep positions
    const curPos = targetWf.nodes[targetExtractorIdx].position;
    targetWf.nodes[targetExtractorIdx] = sourceExtractor;
    targetWf.nodes[targetExtractorIdx].position = curPos;
    console.log('Restored Claims Extractor from CLEANUP-V2 and fixed prompt markdown conflict.');
}

if (targetParserIdx !== -1 && sourceParser) {
    const curPos = targetWf.nodes[targetParserIdx].position;
    targetWf.nodes[targetParserIdx] = sourceParser;
    targetWf.nodes[targetParserIdx].position = curPos;
    console.log('Restored Claims Extractor Output Parser schema from CLEANUP-V2.');
}

fs.writeFileSync(targetPath, JSON.stringify(targetWf, null, 2));
console.log('Successfully aligned prompt and schema with Execution 2913 settings!');
