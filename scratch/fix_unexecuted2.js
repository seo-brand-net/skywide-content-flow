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
        
        // Let's find ANY expression that looks like:
        // {{ $('Surgical Rewriter').first().json.message?.content || $('Surgical Rewriter').first().json.choices?.[0]?.message?.content }}
        // and replace it with a safe fallback
        
        const badStr = `{{ $('Surgical Rewriter').first().json.message?.content || $('Surgical Rewriter').first().json.choices?.[0]?.message?.content }}`;
        const goodStr = `{{ $('Surgical Rewriter').isExecuted ? ($('Surgical Rewriter').first().json.message?.content || $('Surgical Rewriter').first().json.choices?.[0]?.message?.content) : ($('Claude Draft (Claude Opus 3)1').first().json.message?.content || $('Claude Draft (Claude Opus 3)1').first().json.choices?.[0]?.message?.content) }}`;
        
        // In case it was escaped in JSON
        if (pStr.includes("Surgical Rewriter")) {
            let original = pStr;
            
            // We use string split and join to replace all exact occurrences
            pStr = pStr.split(badStr).join(goodStr);
            
            // Also check if there's a version without the choices fallback
            const badStr2 = `{{ $('Surgical Rewriter').first().json.message?.content }}`;
            const goodStr2 = `{{ $('Surgical Rewriter').isExecuted ? $('Surgical Rewriter').first().json.message?.content : $('Claude Draft (Claude Opus 3)1').first().json.message?.content }}`;
            pStr = pStr.split(badStr2).join(goodStr2);
            
            if (pStr !== original) {
                n.parameters = JSON.parse(pStr);
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
    console.log("No nodes needed patching. Let me search for what the exact string is...");
    wf.nodes.forEach(n => {
        if (n.parameters) {
            let pStr = JSON.stringify(n.parameters);
            if (pStr.includes("Surgical Rewriter")) {
                const matches = pStr.match(/\{\{[^\}]*Surgical Rewriter[^\}]*\}\}/g);
                if (matches) {
                    console.log(`Node ${n.name} has these references:`, matches);
                }
            }
        }
    });
}
