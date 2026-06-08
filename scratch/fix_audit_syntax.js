const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

const gates = ['Structure Audit Gate', 'Structure Audit Gate 2'];

for (const node of wf.nodes) {
    if (gates.includes(node.name)) {
        if (node.parameters && node.parameters.conditions && node.parameters.conditions.conditions) {
            for (let cond of node.parameters.conditions.conditions) {
                if (cond.id === 'loop_exit_limit' && cond.leftValue === '={{  }}') {
                    cond.leftValue = '={{ $runIndex }}';
                    console.log(`Fixed syntax error in ${node.name}`);
                }
            }
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
