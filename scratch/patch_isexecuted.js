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
    if (n.name === 'Structure Auditor (Pass 2)') {
        if (n.parameters && n.parameters.text) {
            let pStr = n.parameters.text;
            const bad = `{{ $('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || $('Surgical Rewriter').first().json.message?.content || '' }}`;
            const good = `{{ $('Surgical Rewriter').isExecuted ? ($('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || $('Surgical Rewriter').first().json.message?.content || '') : '' }}`;
            if (pStr.includes(bad)) {
                n.parameters.text = pStr.replace(bad, good);
                patchedCount++;
                console.log('Patched Structure Auditor (Pass 2)');
            }
        }
    }
    
    if (n.name === 'Flag For Human Review') {
        if (n.parameters && n.parameters.text) {
            let pStr = n.parameters.text;
            const bad = `{{ $('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || '' }}`;
            const good = `{{ $('Surgical Rewriter').isExecuted ? ($('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || '') : '' }}`;
            if (pStr.includes(bad)) {
                n.parameters.text = pStr.replace(bad, good);
                patchedCount++;
                console.log('Patched Flag For Human Review');
            }
        }
    }
});

if (patchedCount > 0) {
    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log(`Saved patched workflow. Fixed ${patchedCount} nodes.`);
} else {
    console.log("No nodes needed patching. Verify manually if there are still issues.");
}
