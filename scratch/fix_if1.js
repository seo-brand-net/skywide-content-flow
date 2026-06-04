const fs = require('fs');
const file = 'DEV Skywide Content (Word Count Fix).json';
let wf = JSON.parse(fs.readFileSync(file, 'utf8'));
let modified = false;

const ifNodes = ['If1', 'If2', 'If3'];

ifNodes.forEach(name => {
    const n = wf.nodes.find(x => x.name === name);
    if (!n) return;
    
    // Fix conditions
    if (n.parameters && n.parameters.conditions && n.parameters.conditions.conditions) {
        n.parameters.conditions.conditions.forEach(cond => {
            // Fix condition 1: use $json.output.passed instead of $('AI AgentX').first().json.output.passed
            if (cond.leftValue && typeof cond.leftValue === 'string' && cond.leftValue.includes('json.output.passed')) {
                cond.leftValue = '={{ $json.output.passed }}';
                modified = true;
            }
            
            // Fix condition 2: use $runIndex instead of $json.retryCount
            if (cond.leftValue === '={{ $json.retryCount }}') {
                cond.leftValue = '={{ $runIndex }}';
                // Also adjust right value to maxIterations - 1 like the working If node
                cond.rightValue = '={{ $(\'Clean1\').first().json.maxIterations - 1 }}';
                modified = true;
            }
        });
    }
});

if (modified) {
    fs.writeFileSync(file, JSON.stringify(wf, null, 2));
    console.log('Fixed If1, If2, If3 conditions to avoid pairing errors and use correct loop limits.');
} else {
    console.log('No modifications made.');
}
