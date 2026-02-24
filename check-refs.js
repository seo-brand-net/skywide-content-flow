const fs = require('fs');
const d = JSON.parse(fs.readFileSync('DEV Skywide  Content (TEST v23).json', 'utf8'));

d.nodes.forEach(n => {
    if (n.name.includes('Draft')) {
        let p = n.parameters;
        const prompt = p.messages && p.messages.values ? p.messages.values[0].content : p.systemMessage;
        // Look for the specific string we injected
        if (prompt && prompt.includes('Keyword Strategist')) {
            console.log(n.name, prompt.split('Keyword Strategist')[1].substring(0, 100));
        }
    }
});
