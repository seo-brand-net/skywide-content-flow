const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

for (const node of wf.nodes) {
    if (node.name === 'Data Check & Research Gaps1') {
        if (node.parameters && node.parameters.messages && node.parameters.messages.values) {
            for (let msg of node.parameters.messages.values) {
                if (msg.content) {
                    // Remove Merge references
                    msg.content = msg.content.replace('You MUST verify the final merged article falls within this range before finishing.', 'You MUST verify the final article falls within this range before finishing.');
                    
                    msg.content = msg.content.replace('- Use the stronger introduction (may blend both)', '- Ensure the introduction is exceptionally strong and hooks the reader');
                    msg.content = msg.content.replace('- Keep the clearest explanations regardless of source', '- Keep explanations completely clear and concise');
                    msg.content = msg.content.replace('- Combine complementary examples (avoid duplication)', '- Ensure examples add value and avoid any redundancy');
                    
                    // Remove old Fact Checker logic since QSI Bouncer handles it
                    msg.content = msg.content.replace('- Fact-checks and updates all data with current information  \n', '');
                    
                    // Remove the invalid reference to Post-Draft Fact Checker
                    msg.content = msg.content.replace(
                        /# Verified Fact-Check Report \(MUST apply — correct any claims that contradict this\):\n\{\{ \$\('Post-Draft Fact Checker'\)\.first\(\)\.json\.choices\[0\]\.message\.content \}\}\n/g,
                        ''
                    );
                }
            }
        }
        
        // Sometimes the text is directly on node.parameters.text instead of messages array depending on n8n version
        if (node.parameters && node.parameters.text) {
             let text = node.parameters.text;
             text = text.replace('You MUST verify the final merged article falls within this range before finishing.', 'You MUST verify the final article falls within this range before finishing.');
             text = text.replace('- Use the stronger introduction (may blend both)', '- Ensure the introduction is exceptionally strong and hooks the reader');
             text = text.replace('- Keep the clearest explanations regardless of source', '- Keep explanations completely clear and concise');
             text = text.replace('- Combine complementary examples (avoid duplication)', '- Ensure examples add value and avoid any redundancy');
             text = text.replace('- Fact-checks and updates all data with current information  \n', '');
             text = text.replace(/# Verified Fact-Check Report \(MUST apply — correct any claims that contradict this\):\n\{\{ \$\('Post-Draft Fact Checker'\)\.first\(\)\.json\.choices\[0\]\.message\.content \}\}\n/g, '');
             node.parameters.text = text;
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Cleaned up Data Check & Research Gaps1 prompt.');
