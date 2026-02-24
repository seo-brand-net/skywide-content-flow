const fs = require('fs');
const d = JSON.parse(fs.readFileSync('DEV Skywide  Content (TEST v23).json', 'utf8'));

d.nodes.forEach(n => {
    if (n.name.includes('Draft')) {
        let prompt = '';
        const p = n.parameters;
        if (p.messages && p.messages.values && p.messages.values.length > 0) {
            prompt = p.messages.values[0].content;
        } else if (p.systemMessage) {
            prompt = p.systemMessage;
        }
        fs.writeFileSync(`prompt_${n.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`, prompt);
    }
});
