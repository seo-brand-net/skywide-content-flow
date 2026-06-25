const fs = require('fs');
const dev = JSON.parse(fs.readFileSync('DEV Skywide Content.json', 'utf8'));

console.log('--- FINAL MODEL VERIFICATION ---\n');

dev.nodes.forEach(n => {
    if (
        n.type === '@n8n/n8n-nodes-langchain.lmChatAnthropic' ||
        n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi'
    ) {
        const mv = n.parameters && n.parameters.model;
        const modelStr = mv && mv.value ? mv.value : (typeof mv === 'string' ? mv : 'UNDEFINED');
        console.log('[' + n.type.split('.').pop() + '] ' + n.name + ' --> ' + modelStr);
    }
});
