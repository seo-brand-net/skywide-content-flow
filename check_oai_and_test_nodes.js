const fs = require('fs');
const d = JSON.parse(fs.readFileSync('DEV Skywide  Content (TEST v23).json', 'utf8'));

// 1. Check OpenAI Draft node properties
const oaiDraft = d.nodes.find(n => n.name.includes('OpenAI Draft'));
if (oaiDraft) {
    console.log('--- OpenAI Draft Node Options ---');
    console.dir(oaiDraft.parameters.options, { depth: null });
}

// 2. Identify testing framework nodes (A/B Test Router, Test Result nodes, etc.)
console.log('\\n--- Checking Routing and Export Nodes ---');
d.nodes.forEach(n => {
    if (n.name.includes('Test') || n.name.includes('A/B') || n.name.includes('Split')) {
        console.log(n.name, '||', n.type);
    }
});
