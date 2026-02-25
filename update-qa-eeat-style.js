const fs = require('fs');
const FILE = 'DEV Skywide  Content (TEST v23).json';
const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let updated = false;

d.nodes.forEach(n => {
    // Target AI Agent, AI Agent1, AI Agent2, AI Agent3
    if (n.name.startsWith('AI Agent') && n.type === '@n8n/n8n-nodes-langchain.agent') {
        let p = n.parameters;

        if (p.text) {
            let content = p.text;
            let changed = false;

            const eeatRule = "11. Factual Verification: Are there any names, stats, or citations that look fabricated and aren't in the original brief? Are there any incomplete placeholders like [INSERT HERE]? The article must be immediately publishable.";
            const styleRule = "12. Style Check: Does the article avoid Banned AI phrases (e.g. 'Let's dive in', 'Furthermore', 'The bottom line') and ensure paragraph lengths are generally short (2-3 sentences max)?";

            if (!content.includes('Factual Verification:')) {
                if (content.includes('# Output Instructions')) {
                    content = content.replace(
                        '# Output Instructions',
                        eeatRule + "\\n" + styleRule + "\\n\\n# Output Instructions"
                    );
                } else {
                    content += "\\n" + eeatRule + "\\n" + styleRule;
                }
                changed = true;
            }

            if (changed) {
                p.text = content;
                updated = true;
                console.log("✅ Added QA rules directly to parameters.text in " + n.name);
            }
        }
    }

    // Also check if they are the older HTTP Request versions (just in case they exist)
    if (n.name.startsWith('AI Agent') && n.type === 'n8n-nodes-base.httpRequest') {
        let p = n.parameters;
        if (p.bodyParameters && p.bodyParameters.parameters) {
            let messages = p.bodyParameters.parameters.find(param => param.name === 'messages');
            if (messages && messages.value) {
                let content = messages.value;
                let changed = false;

                const eeatRule = "11. Factual Verification: Are there any names, stats, or citations that look fabricated and aren't in the original brief? Are there any incomplete placeholders like [INSERT HERE]? The article must be immediately publishable.";
                const styleRule = "12. Style Check: Does the article avoid Banned AI phrases (e.g. 'Let's dive in', 'Furthermore', 'The bottom line') and ensure paragraph lengths are generally short (2-3 sentences max)?";

                if (!content.includes('Factual Verification:')) {
                    if (content.includes('# Output Instructions')) {
                        content = content.replace(
                            '# Output Instructions',
                            eeatRule + "\\n" + styleRule + "\\n\\n# Output Instructions"
                        );
                    } else {
                        content += "\\n" + eeatRule + "\\n" + styleRule;
                    }
                    changed = true;
                }

                if (changed) {
                    messages.value = content;
                    updated = true;
                    console.log("✅ Added QA rules to parameters.bodyParameters in " + n.name);
                }
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
