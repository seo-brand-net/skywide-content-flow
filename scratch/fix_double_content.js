const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// The exact regex to match the huge is_revision block. It starts with ={{ $('Webhook1') and ends with : '' }}
// Because it might be preceded by `=` or not, and might have newlines, we use a robust regex.
const revisionRegex = /=\{\{\s*\$\('Webhook1'\)\.first\(\)\.json\.body\.is_revision \? '⚠️ REVISION MODE[\s\S]+? Preserve keywords, client name, tone, and structure\.\\n' : '' \}\}\n?/g;
const revisionRegexNoEquals = /\{\{\s*\$\('Webhook1'\)\.first\(\)\.json\.body\.is_revision \? '⚠️ REVISION MODE[\s\S]+? Preserve keywords, client name, tone, and structure\.\\n' : '' \}\}\n?/g;

let count = 0;

function cleanString(str) {
    let newStr = str.replace(revisionRegex, '');
    newStr = newStr.replace(revisionRegexNoEquals, '');
    if (newStr !== str) count++;
    // If the string starts with a stray `=` after removal, fix it
    if (newStr.startsWith('=\n')) newStr = '=' + newStr.slice(2);
    if (newStr.trim() === '=') newStr = '';
    return newStr;
}

wf.nodes.forEach(n => {
    // Keep it in the Drafter, it is actually needed there!
    if (n.name === 'Claude Draft (Claude Opus 3)1') return;

    if (n.parameters && n.parameters.messages && n.parameters.messages.messageValues) {
        n.parameters.messages.messageValues.forEach(v => {
            if (v.message) v.message = cleanString(v.message);
            if (v.content) v.content = cleanString(v.content);
        });
    }
    if (n.parameters && n.parameters.messages && n.parameters.messages.values) {
        n.parameters.messages.values.forEach(v => {
            if (v.message) v.message = cleanString(v.message);
            if (v.content) v.content = cleanString(v.content);
        });
    }
    if (n.parameters && n.parameters.text) {
        n.parameters.text = cleanString(n.parameters.text);
    }
});

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log(`Successfully removed the problematic revision block from ${count} places in downstream nodes.`);
