const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', 'utf8'));

const bouncerEmptyRule = `\n\n**CREATIVE BYPASS RULE:** If the Approved Claims Manifest arrays are completely empty (\`[]\`), this means the brief is purely creative and does not require strict fact enforcement. In this case, allow general statements to remain, but STILL delete any highly specific hallucinated statistics or fake authority quotes (like fake APA guidelines).`;

const draftEmptyRule = `\n\n**CREATIVE BYPASS RULE:** If the Claims Manifest arrays are completely empty (\`[]\`), this is a purely creative brief. You may write freely, but DO NOT invent highly specific statistics or fake authority quotes.`;

for (const node of wf.nodes) {
    if (node.name === 'Claude Draft (Claude Opus 3)1') {
        if (node.parameters && node.parameters.text && !node.parameters.text.includes('CREATIVE BYPASS RULE')) {
            node.parameters.text += draftEmptyRule;
        }
    }
    if (node.name === 'QSI Claims Verification Bouncer') {
        if (node.parameters && node.parameters.text && !node.parameters.text.includes('CREATIVE BYPASS RULE')) {
            node.parameters.text += bouncerEmptyRule;
        }
    }
}

fs.writeFileSync('DEV_Skywide_Content_QA_Pipeline_Fixed.json', JSON.stringify(wf, null, 2));
console.log('Injected Creative Bypass rules for empty manifests.');
