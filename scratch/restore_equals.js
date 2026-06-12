const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

let count = 0;

function ensureExpression(str) {
    if (typeof str === 'string' && str.includes('{{') && !str.startsWith('=')) {
        count++;
        return '=' + str;
    }
    return str;
}

wf.nodes.forEach(n => {
    if (n.parameters && n.parameters.messages && n.parameters.messages.messageValues) {
        n.parameters.messages.messageValues.forEach(v => {
            if (v.message) v.message = ensureExpression(v.message);
            if (v.content) v.content = ensureExpression(v.content);
        });
    }
    if (n.parameters && n.parameters.messages && n.parameters.messages.values) {
        n.parameters.messages.values.forEach(v => {
            if (v.message) v.message = ensureExpression(v.message);
            if (v.content) v.content = ensureExpression(v.content);
        });
    }
    if (n.parameters && n.parameters.text) {
        n.parameters.text = ensureExpression(n.parameters.text);
    }
    
    // Fix Document Export Sanitization4 fact checker path
    if (n.name === 'Document Export Sanitization4' && n.parameters && n.parameters.messages && n.parameters.messages.values) {
        n.parameters.messages.values.forEach(v => {
            if (v.content && v.content.includes("json.message.content") && v.content.includes("Fact Checker")) {
                v.content = v.content.replace(/\$\('Post-Draft Fact Checker'\)\.first\(\)\.json\.message\.content/g, "$('Post-Draft Fact Checker').first().json.choices[0].message.content");
            }
        });
    }
});

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log(`Successfully restored '=' to ${count} expressions.`);
