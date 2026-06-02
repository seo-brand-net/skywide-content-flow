const fs = require('fs');
const path = 'c:/Users/USER/Documents/Projects/production/skywide/DEV Skywide Content (Word Count Fix).json';
let data = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Update the Keyword Strategist Code
const keywordNode = data.nodes.find(n => n.name === 'Keyword Strategist');
if (keywordNode && keywordNode.parameters && keywordNode.parameters.jsCode) {
    let jsCode = keywordNode.parameters.jsCode;
    
    // Add NO REDUNDANCY rule
    if (!jsCode.includes('NO REDUNDANCY')) {
        jsCode = jsCode.replace(
            /Bold text \(\*\*bold\*\*\) should be used sparingly — only for genuinely critical terms, not for stylistic emphasis\.",?\s*\];/g,
            'Bold text (**bold**) should be used sparingly — only for genuinely critical terms, not for stylistic emphasis.",\n  "NO REDUNDANCY: Do not repeat sections, headings, or information. Once a topic has been covered, do not re-explain it elsewhere. Never generate the same heading twice.",\n];'
        );
    }
    
    // Add NEVER repeat heading rule
    if (!jsCode.includes('NEVER repeat the same H2 heading twice')) {
        jsCode = jsCode.replace(
            /- Do NOT invent your own H2 headings if the outline already specifies them\.\\n\\n`;/g,
            '- Do NOT invent your own H2 headings if the outline already specifies them.\\n- NEVER repeat the same H2 heading twice. Each heading from the outline must be used exactly once.\\n\\n`;'
        );
    }
    
    keywordNode.parameters.jsCode = jsCode;
}

// 2. Safely replace variables inside node parameters
const replaceOldWithNew = (str) => {
    if (typeof str !== 'string') return str;
    
    // Let's replace the whole block by finding the start and end of the block
    let newStr = str;
    
    const blockRegexFirst = /\{\{ \$\('Keyword Strategist'\)\.first\(\)\.json\.system_prompt_injection \}\}[\s\S]*?\{\{ \$\('Keyword Strategist'\)\.first\(\)\.json\.secondary_keyword_checklist \}\}/g;
    const replacementFirst = `{{ $('Keyword Strategist').first().json.global_rules_injection }}\n\n{{ $('Keyword Strategist').first().json.custom_rules_injection }}\n\n{{ $('Keyword Strategist').first().json.first_paragraph_client_injection }}\n\n{{ $('Keyword Strategist').first().json.brief_authority_preamble }}\n\n{{ $('Keyword Strategist').first().json.brief_enforcer_injection }}\n\n{{ $('Keyword Strategist').first().json.faq_injection }}\n\n{{ $('Keyword Strategist').first().json.secondary_keyword_checklist }}`;

    const blockRegexItem = /\{\{ \$\('Keyword Strategist'\)\.item\.json\.system_prompt_injection \}\}[\s\S]*?\{\{ \$\('Keyword Strategist'\)\.item\.json\.secondary_keyword_checklist \}\}/g;
    const replacementItem = `{{ $('Keyword Strategist').item.json.global_rules_injection }}\n\n{{ $('Keyword Strategist').item.json.custom_rules_injection }}\n\n{{ $('Keyword Strategist').item.json.first_paragraph_client_injection }}\n\n{{ $('Keyword Strategist').item.json.brief_authority_preamble }}\n\n{{ $('Keyword Strategist').item.json.brief_enforcer_injection }}\n\n{{ $('Keyword Strategist').item.json.faq_injection }}\n\n{{ $('Keyword Strategist').item.json.secondary_keyword_checklist }}`;
    
    newStr = newStr.replace(blockRegexFirst, replacementFirst);
    newStr = newStr.replace(blockRegexItem, replacementItem);
    
    return newStr;
};

data.nodes.forEach(n => {
    if (n.parameters) {
        if (n.parameters.content) {
            n.parameters.content = replaceOldWithNew(n.parameters.content);
        }
        if (n.parameters.text) {
            n.parameters.text = replaceOldWithNew(n.parameters.text);
        }
        if (n.parameters.message) {
            n.parameters.message = replaceOldWithNew(n.parameters.message);
        }
    }
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Fixed JSON generated safely!');
