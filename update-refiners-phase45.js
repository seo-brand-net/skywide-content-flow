const fs = require('fs');
const FILE = 'DEV Skywide  Content (TEST v23).json';
const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let updated = false;

d.nodes.forEach(n => {
    let p = n.parameters;

    // 1. Update QA Rewriters to remove fake facts instead of guessing
    if (n.name.startsWith('QA Rewriter Agent') && n.type === '@n8n/n8n-nodes-langchain.openAi') {
        const rewriterInstruction = `
### EEAT FACTUAL CORRECTION & ZERO PLACEHOLDER RULE
If the Validator flags a hallucinated name, expert, or statistic, you MUST remove it entirely and write naturally around the concept. Do NOT substitute it with a placeholder like [INSERT STATISTIC]. The final output must be 100% publish-ready.`;

        const injectRewriter = (content) => {
            if (typeof content === 'string' && !content.includes('EEAT FACTUAL CORRECTION')) {
                return content + "\\n" + rewriterInstruction;
            }
            return content;
        };

        if (p.messages && p.messages.values && p.messages.values.length > 0) {
            let old = p.messages.values[0].content;
            let fresh = injectRewriter(old);
            if (old !== fresh) {
                p.messages.values[0].content = fresh;
                updated = true;
                console.log("✅ Updated QA Rewriter rule in " + n.name);
            }
        }
    }

    // 2. Update Downstream Refiners to preserve EEAT and Style
    const refiners = ['Humanised Readability Rewrite', 'NLP & PR Optimization'];
    const isRefiner = refiners.some(r => n.name.includes(r));

    if (isRefiner) {
        const injectRefiner = (content) => {
            if (typeof content !== 'string') return content;
            let newContent = content;

            if (!newContent.includes("eeat_prompt_injection")) {
                newContent += "\\n\\n{{ $('Keyword Strategist').first().json.eeat_prompt_injection }}";
            }

            if (!newContent.includes("style_prompt_injection")) {
                newContent += "\\n\\n{{ $('Keyword Strategist').first().json.style_prompt_injection }}";
            }
            return newContent;
        };

        if (p.systemMessage) {
            let old = p.systemMessage;
            let fresh = injectRefiner(old);
            if (old !== fresh) {
                p.systemMessage = fresh;
                updated = true;
                console.log("✅ Added EEAT/Style to " + n.name);
            }
        }

        if (p.messages && p.messages.values && p.messages.values.length > 0) {
            let old = p.messages.values[0].content;
            let fresh = injectRefiner(old);
            if (old !== fresh) {
                p.messages.values[0].content = fresh;
                updated = true;
                console.log("✅ Added EEAT/Style to " + n.name);
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
