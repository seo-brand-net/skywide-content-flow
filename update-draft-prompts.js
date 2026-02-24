const fs = require('fs');

const FILE = 'DEV Skywide  Content (TEST v23).json';

console.log('Reading workflow file...');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let updated = false;

data.nodes.forEach((n, idx) => {
    if (n.name.includes('Draft')) {
        let p = n.parameters;

        // OpenAI style
        if (p.messages && p.messages.values && p.messages.values.length > 0) {
            let content = p.messages.values[0].content;
            if (content.includes('Keyword Strategist') && !content.includes('structure_prompt_injection')) {
                p.messages.values[0].content = content + "\n\n{{ $('Keyword Strategist').item.json.structure_prompt_injection }}";
                updated = true;
                console.log("✅ Updated " + n.name + " (messages)");
            }
        }
        // Anthropic style
        else if (p.systemMessage) {
            let content = p.systemMessage;
            if (content.includes('Keyword Strategist') && !content.includes('structure_prompt_injection')) {
                p.systemMessage = content + "\n\n{{ $('Keyword Strategist').item.json.structure_prompt_injection }}";
                updated = true;
                console.log("✅ Updated " + n.name + " (systemMessage)");
            }
        }
    }
});

if (updated) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('\n✅ Done! File saved.');
} else {
    console.log('No drafting nodes needed updating.');
}
