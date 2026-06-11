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
const badPattern = /\{\{ \$\('Surgical Rewriter'\)\.first\(\)\.json\.message\?\.content \|\| \$\('Claude Draft \(Claude Opus 3\)1'\)\.first\(\)\.json\.message\?\.content \}\}/g;
const goodPattern = `{{ $('Surgical Rewriter').isExecuted ? $('Surgical Rewriter').first().json.message?.content : $('Claude Draft (Claude Opus 3)1').first().json.message?.content }}`;

wf.nodes.forEach(n => {
    if (n.parameters) {
        let pStr = JSON.stringify(n.parameters);
        if (pStr.includes("$('Surgical Rewriter').first()")) {
            const newStr = pStr.replace(badPattern, goodPattern);
            if (newStr !== pStr) {
                n.parameters = JSON.parse(newStr);
                patchedCount++;
                console.log(`Patched node: ${n.name}`);
            }
        }
    }
});

if (patchedCount > 0) {
    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log(`Saved patched workflow. Fixed ${patchedCount} nodes.`);
} else {
    console.log("No nodes needed patching.");
}
