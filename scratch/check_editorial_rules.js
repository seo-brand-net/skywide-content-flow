const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

const draftNode = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
let draftPrompt = '';
if (draftNode && draftNode.parameters && draftNode.parameters.messages && draftNode.parameters.messages.messageValues) {
    draftPrompt = JSON.stringify(draftNode.parameters.messages.messageValues);
}

console.log('=== EDITORIAL RULES IN CLAUDE DRAFT ===');
console.log('Rule 1 - Client in CLOSING paragraph:', draftPrompt.includes('closing paragraph') || draftPrompt.includes('final paragraph') ? 'YES' : 'NO - MISSING');
console.log('Rule 2 - First-person brand voice:', draftPrompt.includes('first-person') || draftPrompt.includes('first person') ? 'YES' : 'NO - MISSING');
console.log('Rule 3 - Em-dash ban:', draftPrompt.includes('em-dash') || draftPrompt.includes('em dash') ? 'YES' : 'NO - MISSING');
console.log('Rule 3 - Journey ban:', draftPrompt.includes('journey') ? 'YES' : 'NO - MISSING');
console.log('Rule 3 - Navigate ban:', draftPrompt.includes('navigate') ? 'YES' : 'NO - MISSING');
console.log('Rule 3 - Comprehensive restriction:', draftPrompt.includes('comprehensive') ? 'YES' : 'NO - MISSING');
console.log('Meta Title enforcement:', draftPrompt.includes('Meta Title') ? 'YES' : 'NO - MISSING');

// Check all downstream editor nodes
const editors = [
    'Claude Keyword Check + Semantic Gap1',
    'Claude Apply Recommendations1',
    'Claude EEAT Injection1',
    'Claude NLP & PR Optimization',
    'Claude Humanised Readability Rewrite',
    'Claude Final SEO Snippet Optimization',
    'QSI Claims Verification Bouncer'
];

console.log('\n=== EDITORIAL RULES IN DOWNSTREAM EDITORS ===');
for (const name of editors) {
    const node = wf.nodes.find(n => n.name === name);
    if (!node) continue;
    const text = node.parameters && node.parameters.text ? node.parameters.text : '';
    const hasEmDash = text.includes('em-dash') || text.includes('em dash');
    const hasMetaTitle = text.includes('Meta Title');
    const hasFirstPerson = text.includes('first-person') || text.includes('first person');
    const hasClosing = text.includes('closing paragraph') || text.includes('final paragraph');
    console.log(name + ':');
    console.log('  Em-dash ban:', hasEmDash ? 'YES' : 'MISSING');
    console.log('  Meta Title:', hasMetaTitle ? 'YES' : 'MISSING');
    console.log('  First-person:', hasFirstPerson ? 'YES' : 'MISSING');
    console.log('  Closing paragraph:', hasClosing ? 'YES' : 'MISSING');
}

// Check Keyword Strategist for the 4 missing fields
const ks = wf.nodes.find(n => n.name === 'Keyword Strategist');
const code = ks && ks.parameters ? (ks.parameters.jsCode || ks.parameters.code || '') : '';
console.log('\n=== KEYWORD STRATEGIST INJECTION FIELDS ===');
const fields = ['eeat_prompt_injection', 'style_prompt_injection', 'system_prompt_injection', 'structure_prompt_injection'];
fields.forEach(f => {
    console.log(f + ':', code.includes(f) ? 'BUILT' : 'NOT BUILT - returns undefined on every run');
});
