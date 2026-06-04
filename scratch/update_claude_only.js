const fs = require('fs');
const file = 'DEV Skywide Content (Word Count Fix).json';
let wf = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Re-disable OpenAI nodes
const openaiNodes = [
    'OpenAI Draft (GPT-4O)1',
    'OpenAI Keyword Check + Semantic Gap1',
    'OpenAI EEAT Injection1',
    'OpenAI NLP & PR Optimization',
    'OpenAI Humanised Readability Rewrite'
];

openaiNodes.forEach(name => {
    const n = wf.nodes.find(x => x.name === name);
    if (n) {
        n.disabled = true;
    }
});

// 2. Update Data Check & Research Gaps1
const dataCheckNode = wf.nodes.find(x => x.name === 'Data Check & Research Gaps1');
if (dataCheckNode && dataCheckNode.parameters && dataCheckNode.parameters.messages) {
    let msg = dataCheckNode.parameters.messages.messageValues ? 
              dataCheckNode.parameters.messages.messageValues[0].message : 
              dataCheckNode.parameters.messages.message[1].content;
              
    // Perform string replacements
    msg = msg.replace('# Synthesis Task', '# Synthesis & Polish Task');
    msg = msg.replace('Merge these two drafts into one exceptional article that:', 'Review and improve this draft to create an exceptional article that:');
    msg = msg.replace('- Combines the best insights, examples, and explanations from both', '- Enhances the best insights, examples, and explanations');
    msg = msg.replace('- Creates seamless flow (not a choppy mashup)', '- Creates seamless flow');
    
    msg = msg.replace('- Use the stronger introduction (may blend both)\\n- Keep the clearest explanations regardless of source\\n- Combine complementary examples (avoid duplication)', '- Ensure a strong, engaging introduction\\n- Keep explanations clear and concise');
    
    msg = msg.replace('# Draft 1:\\n{{ $(\'OpenAI Draft (GPT-4O)1\').first().json.message.content }}\\n\\n# Draft 2:  \\n{{ $(\'Claude Draft (Claude Opus 3)1\').first().json.text }}', '# Draft:\\n{{ $(\'Claude Draft (Claude Opus 3)1\').first().json.text }}');
    
    msg = msg.replace('Count total words in your merged article', 'Count total words in your final article');
    
    // Save back
    if (dataCheckNode.parameters.messages.messageValues) {
        dataCheckNode.parameters.messages.messageValues[0].message = msg;
    } else {
        dataCheckNode.parameters.messages.message[1].content = msg;
    }
}

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('Successfully re-disabled OpenAI nodes and updated the Data Check node to work with a single Claude draft.');
