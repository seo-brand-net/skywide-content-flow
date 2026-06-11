const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// Helper to fix the expression
function fixExpression(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\$\('Parse Creative Brief \(LLM\)'\)\.first\(\)\.json\.choices\[0\]\.message\.content/g, "$('Parse Creative Brief (LLM)').first().json.message.content");
}

// 1. Fix Claude Draft
const claudeDraft = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
if (claudeDraft) {
    claudeDraft.parameters.messages.messageValues[0].message = fixExpression(claudeDraft.parameters.messages.messageValues[0].message);
}

// 2. Fix AI Agent1
const aiAgent = wf.nodes.find(n => n.name === 'AI Agent1');
if (aiAgent) {
    aiAgent.parameters.text = fixExpression(aiAgent.parameters.text);
}

// 3. Fix Surgical Rewriter
const surgical = wf.nodes.find(n => n.name === 'Surgical Rewriter');
if (surgical) {
    surgical.parameters.messages.values[0].content = fixExpression(surgical.parameters.messages.values[0].content);
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Successfully fixed the expression paths for Parse Creative Brief (LLM).');
