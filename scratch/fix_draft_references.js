const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

for (const node of wf.nodes) {
    if (node.name === 'Claude Draft (Claude Opus 3)1') {
        if (node.parameters && node.parameters.text) {
            // Find the claims manifest section and replace it completely
            node.parameters.text = node.parameters.text.replace(
                /\{\{ \$\("Claims Extractor & Manifest Generator"\)\.first\(\)\.json\.\ \}\}\n\{\{ \$node\["Claims Extractor & Manifest Generator"\]\.json\.approved_statistics \}\}/g,
                "{{ JSON.stringify($('Verified Claims Parser').first().json.output || $('Verified Claims Parser').first().json) }}"
            );
            
            // Just to be safe if the regex fails:
            node.parameters.text = node.parameters.text.replace(
                '{{ $("Claims Extractor & Manifest Generator").first().json. }}\n{{ $node["Claims Extractor & Manifest Generator"].json.approved_statistics }}',
                "{{ JSON.stringify($('Verified Claims Parser').first().json.output || $('Verified Claims Parser').first().json) }}"
            );
            
            // And any other lingering old references to the Extractor node
            node.parameters.text = node.parameters.text.replace(
                /Claims Extractor \& Manifest Generator/g,
                "Verified Claims Parser"
            );
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Fixed Claude Draft references to Verified Claims Parser.');
