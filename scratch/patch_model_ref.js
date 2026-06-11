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
    if (n.parameters) {
        let pStr = JSON.stringify(n.parameters);
        const original = pStr;
        
        // Find if ANY node accidentally references a Model node as a data source
        // Example: $('Model — Apply Recommendations')
        if (pStr.includes("Model — Apply Recommendations")) {
            console.log(`Node '${n.name}' has invalid Model reference. Fixing...`);
            pStr = pStr.replace(/\$\('Model — Apply Recommendations'\)/g, "$('OpenAI SEO Optimization1')");
        }
        
        // Let's also check for other Model nodes just in case
        if (pStr.includes("Model — Keyword Check")) {
            console.log(`Node '${n.name}' has invalid Model — Keyword Check reference. Fixing...`);
            pStr = pStr.replace(/\$\('Model — Keyword Check'\)/g, "$('OpenAI SEO Optimization1')"); // actually Keyword Check doesn't have an OpenAI node, but let's see if it's there
        }

        if (pStr !== original) {
            n.parameters = JSON.parse(pStr);
            patchedCount++;
        }
    }
});

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log(`Saved patched workflow. Fixed ${patchedCount} nodes.`);
