const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const trace = [
    'Claude Draft (Claude Opus 3)1',
    'Data Check & Research Gaps1',
    'Claude Keyword Check + Semantic Gap1',
    'Wait18',
    'Claude EEAT Injection1',
    'Wait14',
    'Claude NLP & PR Optimization',
    'Wait7',
    'Document Export Sanitization5',
    'Edit Fields2',
    'AI Agent1',
    'If1',
    'Surgical Rewriter',
    'Document Export Sanitization4',
    'Signal Completion'
];

trace.forEach(name => {
    const n = wf.nodes.find(x => x.name === name);
    if (!n) {
        console.log(name, 'NOT FOUND');
        return;
    }
    console.log(`\n--- ${name} (${n.type}) ---`);
    if (n.parameters && n.parameters.messages && n.parameters.messages.messageValues) {
        console.log('Message 0 (length):', n.parameters.messages.messageValues[0].message.length);
        const match = n.parameters.messages.messageValues[0].message.match(/\{\{.+?\}\}/g);
        console.log('Expressions:', match ? match.slice(0, 3) : 'none');
    }
    if (n.parameters && n.parameters.text) {
        console.log('Text expressions:', n.parameters.text.match(/\{\{.+?\}\}/g));
    }
});
