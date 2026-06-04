const fs = require('fs');
const file = 'DEV Skywide Content (Word Count Fix).json';
let wf = JSON.parse(fs.readFileSync(file, 'utf8'));

const ifNodes = ['If1', 'If2', 'If3'];

ifNodes.forEach(name => {
    const n = wf.nodes.find(x => x.name === name);
    if (!n) return;
    
    if (n.parameters && n.parameters.conditions) {
        // Change strict to loose
        if (n.parameters.conditions.options) {
            n.parameters.conditions.options.typeValidation = 'loose';
        }
        
        // Fix syntax error in leftValue
        if (n.parameters.conditions.conditions) {
            n.parameters.conditions.conditions.forEach(cond => {
                if (cond.leftValue && typeof cond.leftValue === 'string' && cond.leftValue.includes('.output.passed') && !cond.leftValue.includes('$json')) {
                    cond.leftValue = '={{ $json.output.passed }}';
                }
            });
        }
    }
});

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('Fixed syntax error and set typeValidation to loose for If1, If2, If3.');
