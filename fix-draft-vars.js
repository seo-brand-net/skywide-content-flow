const fs = require('fs');

const FILE = 'DEV Skywide  Content (TEST v23).json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let updated = false;

data.nodes.forEach(n => {
    if (n.parameters) {
        let p = n.parameters;

        // Deep search and replace in parameters
        const fixString = (str) => {
            if (typeof str !== 'string') return str;

            let newStr = str;

            // Fix 1: keyword_strategy is not a key in the output anymore. 
            // Replace: $('Keyword Strategist').first().json.keyword_strategy.system_prompt_injection
            // With:    $('Keyword Strategist').first().json.system_prompt_injection
            if (newStr.includes("keyword_strategy.system_prompt_injection")) {
                newStr = newStr.replace(/keyword_strategy\\.system_prompt_injection/g, "system_prompt_injection");
            }

            // Fix 2: item.json instead of first().json 
            // Since it's outside a loop or mapping, it usually should be .item or .first() depending on n8n version, 
            // but the user's prompt says "item.json" is staying red? Actually .first().json is safer for single output nodes.
            // Let's standardise to .first().json for everything referencing Keyword Strategist.
            if (newStr.includes("$('Keyword Strategist').item.json")) {
                newStr = newStr.replace(/\\$\\('Keyword Strategist'\\)\\.item\\.json/g, "$('Keyword Strategist').first().json");
            }

            return newStr;
        };

        const traverse = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    let oldStr = obj[key];
                    let newStr = fixString(oldStr);
                    if (newStr !== oldStr) {
                        obj[key] = newStr;
                        updated = true;
                        console.log("✅ Fixed reference in " + n.name + " (property: " + key + ")");
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    traverse(obj[key]);
                }
            }
        };

        traverse(p);
    }

    // Specific fix for missing structure injection in Claude
    if (n.name.includes('Claude Draft') || n.name.includes('OpenAI Draft')) {
        let p = n.parameters;

        const ensureInjections = (content) => {
            let newContent = content;
            // Make sure it has system_prompt_injection
            if (!newContent.includes("system_prompt_injection")) {
                newContent += "\\n\\n{{ $('Keyword Strategist').first().json.system_prompt_injection }}";
            }
            // Make sure it has structure_prompt_injection
            if (!newContent.includes("structure_prompt_injection")) {
                newContent += "\\n\\n{{ $('Keyword Strategist').first().json.structure_prompt_injection }}";
            }
            return newContent;
        };

        if (p.systemMessage) {
            let old = p.systemMessage;
            let fresh = ensureInjections(old);
            if (old !== fresh) {
                p.systemMessage = fresh;
                updated = true;
                console.log("✅ Added missing injections to " + n.name);
            }
        }

        if (p.messages && p.messages.values && p.messages.values.length > 0) {
            let old = p.messages.values[0].content;
            let fresh = ensureInjections(old);
            if (old !== fresh) {
                p.messages.values[0].content = fresh;
                updated = true;
                console.log("✅ Added missing injections to " + n.name);
            }
        }
    }
});

if (updated) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('\\n✅ Done! File saved.');
} else {
    console.log('No fixes needed');
}
