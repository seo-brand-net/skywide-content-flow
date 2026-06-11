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
        
        // Let's replace any instance of:
        // $('Surgical Rewriter').first()
        // with:
        // $('Surgical Rewriter').isExecuted ? $('Surgical Rewriter').first() : undefined
        // Actually, replacing exactly the ternary blocks is safer.
        
        pStr = pStr.replace(/\$\('Surgical Rewriter'\)\.first\(\) \?/g, "$('Surgical Rewriter').isExecuted ?");
        pStr = pStr.replace(/\$\('Surgical Rewriter'\)\.first\(\)\.json\.text \|\| \$\('Surgical Rewriter'\)\.first\(\)\.json\.output/g, "$('Surgical Rewriter').isExecuted ? ($('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || $('Surgical Rewriter').first().json.message?.content || '') : ''");
        
        // The one in Structure Auditor
        // "CORRECTED ARTICLE TO AUDIT (post-rewrite):\n{{ $('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || $('Surgical Rewriter').first().json.message?.content || '' }}"
        // It's easier to just parse the objects!
    }
});

// Let's do it manually for the known nodes to be absolutely safe
const auditor = wf.nodes.find(n => n.name === 'Structure Auditor (Pass 2)');
if (auditor && auditor.parameters.messages) {
    let content = auditor.parameters.messages.values[1].content;
    const bad = `{{ $('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || $('Surgical Rewriter').first().json.message?.content || '' }}`;
    const good = `{{ $('Surgical Rewriter').isExecuted ? ($('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || $('Surgical Rewriter').first().json.message?.content || '') : '' }}`;
    if (content.includes(bad)) {
        auditor.parameters.messages.values[1].content = content.replace(bad, good);
        patchedCount++;
    }
}

const flagger = wf.nodes.find(n => n.name === 'Flag For Human Review');
if (flagger && flagger.parameters.messages) {
    let content = flagger.parameters.messages.values[1].content;
    const bad = `{{ $('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || '' }}`;
    const good = `{{ $('Surgical Rewriter').isExecuted ? ($('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || '') : '' }}`;
    if (content.includes(bad)) {
        flagger.parameters.messages.values[1].content = content.replace(bad, good);
        patchedCount++;
    }
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log(`Saved patched workflow. Fixed ${patchedCount} nodes.`);
