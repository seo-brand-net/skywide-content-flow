const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

for (const node of wf.nodes) {
    if (node.name === 'Verified Claims Parser') {
        if (node.parameters && node.parameters.text) {
            // Replace the bad reference with the correct Perplexity output structure
            node.parameters.text = node.parameters.text.replace(
                '{{ $json.message.content || $json.text || $json.output }}',
                "{{ $('Pre-Draft Fact Checker').first().json.choices[0].message.content }}"
            );
            console.log('Fixed reference in Verified Claims Parser');
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
