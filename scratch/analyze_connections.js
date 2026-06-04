const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
const nodes = wf.nodes;
const connections = wf.connections;

// 1. Check what feeds INTO merge node
console.log('=== INPUTS TO: Data Check & Research Gaps1 ===');
Object.entries(connections).forEach(([fromNode, conns]) => {
    const main = conns.main || [];
    main.forEach(outputs => {
        (outputs || []).forEach(edge => {
            if (edge.node === 'Data Check & Research Gaps1') {
                console.log('  From:', fromNode, '-> index:', edge.index);
            }
        });
    });
});

// 2. What draft nodes output to
console.log('\n=== OUTPUTS FROM: OpenAI Draft (GPT-4O)1 ===');
console.log(JSON.stringify(connections['OpenAI Draft (GPT-4O)1'], null, 2));

console.log('\n=== OUTPUTS FROM: Claude Draft (Claude Opus 3)1 ===');
console.log(JSON.stringify(connections['Claude Draft (Claude Opus 3)1'], null, 2));

// 3. Keyword Strategist connections
console.log('\n=== OUTPUTS FROM: Keyword Strategist ===');
console.log(JSON.stringify(connections['Keyword Strategist'], null, 2));

// 4. Pre-Draft Fact Checker connections
console.log('\n=== OUTPUTS FROM: Pre-Draft Fact Checker ===');
console.log(JSON.stringify(connections['Pre-Draft Fact Checker'], null, 2));

// 5. Clean1 connections (feeds writers)
console.log('\n=== OUTPUTS FROM: Clean1 ===');
console.log(JSON.stringify(connections['Clean1'], null, 2));

// 6. Get full prompt of OpenAI Draft writer node
const openaiDraftNode = nodes.find(n => n.name === 'OpenAI Draft (GPT-4O)1');
if (openaiDraftNode) {
    const p = openaiDraftNode.parameters || {};
    if (p.messages && p.messages.values) {
        console.log('\n=== OpenAI Draft FULL PROMPT ===');
        p.messages.values.forEach((m, i) => {
            console.log('Message', i, 'role:', m.role);
            console.log(String(m.content).substring(0, 2000));
        });
    }
}

// 7. Get full prompt of Claude Draft writer node
const claudeDraftNode = nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
if (claudeDraftNode) {
    const p = claudeDraftNode.parameters || {};
    const text = p.text || (p.messages && p.messages.messageValues && p.messages.messageValues[0] && p.messages.messageValues[0].message);
    console.log('\n=== Claude Draft FULL PROMPT (first 2000 chars) ===');
    console.log(String(text || JSON.stringify(p)).substring(0, 2000));
}

// 8. Structure auditor scoring issue
const scoringNode = nodes.find(n => n.name === '1st Scoring Agent3');
if (scoringNode) {
    console.log('\n=== Scoring Agent3 TYPE + PARAMS KEYS ===');
    console.log('Type:', scoringNode.type);
    const p = scoringNode.parameters || {};
    console.log('Keys:', Object.keys(p).join(', '));
}

// 9. Structure audit gate logic
const auditGate = nodes.find(n => n.name === 'Structure Audit Gate');
if (auditGate) {
    console.log('\n=== Structure Audit Gate CONDITIONS ===');
    console.log(JSON.stringify(auditGate.parameters, null, 2).substring(0, 1000));
}

// 10. Client Site Researcher full prompt
const clientResearcher = nodes.find(n => n.name === 'Client Site Researcher');
if (clientResearcher) {
    const p = clientResearcher.parameters || {};
    if (p.messages && p.messages.message) {
        console.log('\n=== Client Site Researcher FULL PROMPT ===');
        p.messages.message.forEach((m, i) => {
            console.log('Message', i, ':', String(m.content).substring(0, 1500));
        });
    }
}
