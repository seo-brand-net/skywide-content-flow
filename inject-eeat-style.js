const fs = require('fs');
const FILE = 'DEV Skywide  Content (TEST v23).json';
const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let updated = false;

d.nodes.forEach(n => {
    if (n.name.includes('Claude Draft') || n.name.includes('OpenAI Draft')) {
        let p = n.parameters;

        const injectPayloads = (content) => {
            if (typeof content !== 'string') return content;
            let newContent = content;

            // Ensure eeat_prompt_injection exists
            if (!newContent.includes("eeat_prompt_injection")) {
                newContent += "\\n\\n{{ $('Keyword Strategist').first().json.eeat_prompt_injection }}";
            }

            // Ensure style_prompt_injection exists
            if (!newContent.includes("style_prompt_injection")) {
                newContent += "\\n\\n{{ $('Keyword Strategist').first().json.style_prompt_injection }}";
            }

            return newContent;
        };

        // Deep replace in text properties
        if (p.text) {
            let fresh = injectPayloads(p.text);
            if (fresh !== p.text) {
                p.text = fresh;
                updated = true;
                console.log("✅ Added EEAT/Style to parameters.text in " + n.name);
            }
        }

        // Replace in systemMessage
        if (p.systemMessage) {
            let fresh = injectPayloads(p.systemMessage);
            if (fresh !== p.systemMessage) {
                p.systemMessage = fresh;
                updated = true;
                console.log("✅ Added EEAT/Style to parameters.systemMessage in " + n.name);
            }
        }

        // Replace in messages.values
        if (p.messages && p.messages.values && p.messages.values.length > 0) {
            let old = p.messages.values[0].content;
            let fresh = injectPayloads(old);
            if (fresh !== old) {
                p.messages.values[0].content = fresh;
                updated = true;
                console.log("✅ Added EEAT/Style to parameters.messages.values in " + n.name);
            }
        }

        // Replace in messages.messageValues
        if (p.messages && p.messages.messageValues && p.messages.messageValues.length > 0) {
            let old = p.messages.messageValues[0].message;
            let fresh = injectPayloads(old);
            if (fresh !== old) {
                p.messages.messageValues[0].message = fresh;
                updated = true;
                console.log("✅ Added EEAT/Style to parameters.messages.messageValues in " + n.name);
            }
        }
    }
});

if (updated) {
    fs.writeFileSync(FILE, JSON.stringify(d, null, 2), 'utf8');
    console.log('\\n✅ Done! File saved.');
} else {
    console.log('No fixes needed');
}
