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
    if (n.parameters && typeof n.parameters.text === 'string') {
        let pStr = n.parameters.text;
        
        // This regex matches exactly $('Surgical Rewriter').first() that is not guarded by isExecuted
        // We will just replace ALL $('Surgical Rewriter').first() with $('Surgical Rewriter').isExecuted ? $('Surgical Rewriter').first() : undefined 
        // But wait, it's easier to just do:
        
        if (pStr.includes("$('Surgical Rewriter').first()")) {
            // Let's replace the whole {{ ... }} block if it contains Surgical Rewriter
            // To be totally safe, I'll just use a dumb string replace for the specific known lines
            
            if (n.name === 'Structure Auditor (Pass 2)') {
                pStr = `{{ $('Surgical Rewriter').isExecuted ? ($('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || $('Surgical Rewriter').first().json.message?.content || '') : '' }}`;
                n.parameters.text = pStr;
                patchedCount++;
            } else if (n.name === 'Flag For Human Review') {
                pStr = `{{ $('Surgical Rewriter').isExecuted ? ($('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || '') : '' }}`;
                n.parameters.text = pStr;
                patchedCount++;
            }
        }
    }
});

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log(`Saved patched workflow. Fixed ${patchedCount} nodes.`);
