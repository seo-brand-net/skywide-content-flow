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

const flagger = wf.nodes.find(n => n.name === 'Flag For Human Review');
if (flagger && flagger.parameters.assignments && flagger.parameters.assignments.assignments) {
    const assignments = flagger.parameters.assignments.assignments;
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].name === 'content') {
            const bad = `={{ $('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || '' }}`;
            const good = `={{ $('Surgical Rewriter').isExecuted ? ($('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || '') : '' }}`;
            if (assignments[i].value === bad) {
                assignments[i].value = good;
                patchedCount++;
                console.log('Patched Flag For Human Review');
            }
        }
    }
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log(`Saved patched workflow. Fixed ${patchedCount} nodes.`);
