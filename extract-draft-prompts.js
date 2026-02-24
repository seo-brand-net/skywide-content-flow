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
        console.log(`\n\n=== ${n.name} ===\n`);
        console.log(prompt.substring(0, 1000) + '...');
    }
});
