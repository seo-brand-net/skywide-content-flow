const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

for (const node of wf.nodes) {
    if (node.name === 'Claims Extractor & Manifest Generator') {
        if (node.parameters && node.parameters.text) {
            node.parameters.text = node.parameters.text.replace(
                '{{ $json.brief }}', 
                "{{ $('Webhook1').first().json.body.creative_brief || 'No Brief Provided' }}"
            ).replace(
                '{{ $json.website_text }}',
                "{{ JSON.stringify($json) }}"
            );
        }
    }
    
    if (node.name === 'Claude Draft (Claude Opus 3)1') {
        if (node.parameters && node.parameters.text) {
            // Fix claims manifest injection
            node.parameters.text = node.parameters.text.replace(
                '{{ $node["Claims Extractor & Manifest Generator"].json.approved_claims }}\n{{ $node["Claims Extractor & Manifest Generator"].json.approved_statistics }}',
                "{{ JSON.stringify($('Claims Extractor & Manifest Generator').first().json.output || $('Claims Extractor & Manifest Generator').first().json) }}"
            );
            
            // Remove the broken Keyword Strategist injections
            node.parameters.text = node.parameters.text.replace("{{ $('Keyword Strategist').first().json.eeat_prompt_injection }}", '');
            node.parameters.text = node.parameters.text.replace("{{ $('Keyword Strategist').first().json.style_prompt_injection }}", '');
        }
    }
    
    if (node.name === 'QSI Claims Verification Bouncer') {
        if (node.parameters && node.parameters.text) {
            // Fix draft article input
            node.parameters.text = node.parameters.text.replace(
                '{{ $json.draft }}',
                "{{ $json.output || $json.text || $json.message?.content }}"
            );
            
            // Fix claims manifest injection
            node.parameters.text = node.parameters.text.replace(
                '{{ $node["Claims Extractor & Manifest Generator"].json.approved_claims }}\n{{ $node["Claims Extractor & Manifest Generator"].json.approved_statistics }}',
                "{{ JSON.stringify($('Claims Extractor & Manifest Generator').first().json.output || $('Claims Extractor & Manifest Generator').first().json) }}"
            );
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Fixed red node variables.');
