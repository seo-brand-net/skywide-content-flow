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
        
        // Fix the ternary condition that crashes n8n
        const badCondition = `$('Surgical Rewriter').first() ?`;
        const goodCondition = `$('Surgical Rewriter').isExecuted ?`;
        
        if (pStr.includes(badCondition)) {
            pStr = pStr.split(badCondition).join(goodCondition);
        }
        
        // Fix Structure Auditor (Pass 2) and Flag For Human Review if they can be bypassed
        // Wait, if they are directly connected to Surgical Rewriter, they won't run if it's bypassed, 
        // so it's fine for them to use .first() because they only execute if it executed.
        // Let's just fix the downstream ones that use the ternary.
        
        if (pStr !== JSON.stringify(n.parameters)) {
            n.parameters = JSON.parse(pStr);
            patchedCount++;
            console.log(`Patched node: ${n.name}`);
        }
    }
});

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log(`Saved patched workflow. Fixed ${patchedCount} nodes.`);
