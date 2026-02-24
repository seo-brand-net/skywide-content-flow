const fs = require('fs');

const FILE = 'DEV Skywide  Content (TEST v23).json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let updated = false;

data.nodes.forEach(n => {
    if (n.name.includes('Draft')) {
        let p = n.parameters;
        const fixReference = (content) => {
            if (content && content.includes("$('Keyword Strategist').item.json.structure_prompt_injection")) {
                return content.replace(
                    /\\$\\('Keyword Strategist'\\)\\.item\\.json\\.structure_prompt_injection/g,
                    "$('Keyword Strategist').first().json.structure_prompt_injection"
                );
            }
            return content;
        };

        if (p.messages && p.messages.values && p.messages.values.length > 0) {
            let old = p.messages.values[0].content;
            let fresh = fixReference(old);
            if (old !== fresh) {
                p.messages.values[0].content = fresh;
                updated = true;
                console.log("✅ Fixed reference in " + n.name);
            }
        } else if (p.systemMessage) {
            let old = p.systemMessage;
            let fresh = fixReference(old);
            if (old !== fresh) {
                p.systemMessage = fresh;
                updated = true;
                console.log("✅ Fixed reference in " + n.name);
            }
        }
    }
});

if (updated) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Done!');
} else {
    console.log('No fixes needed');
}
