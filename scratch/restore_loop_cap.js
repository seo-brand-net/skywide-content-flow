const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const if1 = wf.nodes.find(n => n.name === 'If1');
if (if1) {
    // Check if the condition already exists
    const hasRunsCondition = if1.parameters.conditions.conditions.find(c => c.leftValue === '={{ $json.runs }}');
    
    if (!hasRunsCondition) {
        if1.parameters.conditions.conditions.push({
            "id": "loop_exit_limit",
            "leftValue": "={{ $json.runs }}",
            "rightValue": 3,
            "operator": {
                "type": "number",
                "operation": "largerEqual"
            }
        });
        
        fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
        console.log('Successfully added runs >= 3 condition back to If1 node.');
    } else {
        console.log('Condition already exists!');
    }
} else {
    console.log('If1 node not found.');
}
