const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const draft = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
if (draft && draft.parameters.messages) {
    let msgs = draft.parameters.messages.messageValues || draft.parameters.messages.values;
    if (msgs) {
        msgs.forEach(v => {
            const field = v.message !== undefined ? 'message' : 'content';
            if (v[field] && v.role === 'system') {
                // Replace the JSON parser string with the raw webhook brief
                v[field] = v[field].replace(
                    /\{\{\s*JSON\.stringify\(\$\('Parse Creative Brief \(LLM\)'\)\.first\(\)\.json\.message\.content,\s*null,\s*2\)\s*\}\}/g, 
                    "{{ $('Webhook1').first().json.body.creative_brief }}"
                );
            }
        });
    }
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Successfully reverted the Drafter prompt to use the raw creative brief.');
