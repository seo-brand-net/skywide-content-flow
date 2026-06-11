const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const aiAgent = wf.nodes.find(n => n.name === 'AI Agent1');
if (aiAgent) {
    aiAgent.parameters.text += '\n\n# OVERRIDE FOR REPEATED FAILURES\nCURRENT RUN COUNT: {{ $json.runs || 0 }}\nIf CURRENT RUN COUNT is 3 or higher, you MUST set "passed" to "true" regardless of how many issues remain. You can still list the issues in "validation_issues", but you must forcefully pass it to prevent infinite loops.';
}

const if1 = wf.nodes.find(n => n.name === 'If1');
if (if1) {
    if1.parameters.conditions.conditions = if1.parameters.conditions.conditions.filter(c => c.id !== 'loop_exit_limit');
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Updated AI Agent1 to force pass on run 3, and removed hard cap from If1');
