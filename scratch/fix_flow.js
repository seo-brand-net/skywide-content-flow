const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// 1. Update Keyword Strategist
const ks = wf.nodes.find(n => n.name === 'Keyword Strategist');
if (ks && ks.parameters && ks.parameters.jsCode) {
    let code = ks.parameters.jsCode;
    
    // Remove the short paragraphs rule
    code = code.replace(/"Keep paragraphs to 2–3 sentences maximum\. Long paragraphs must be broken up\.",\n\s*/g, '');
    
    // Add flow and transition rule if not present
    if (!code.includes('smooth, natural transitions')) {
        const insertionPoint = code.indexOf('const GLOBAL_RULES = [\n') + 'const GLOBAL_RULES = [\n'.length;
        code = code.substring(0, insertionPoint) + '  "Ensure smooth, natural transitions between sections. The article must flow cohesively as a single, unified narrative rather than a disjointed list of separate sections.",\n' + code.substring(insertionPoint);
    }
    
    ks.parameters.jsCode = code;
}

// 2. Update Drafter Prompt
const draft = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
if (draft && draft.parameters.messages) {
    let msgs = draft.parameters.messages.messageValues || draft.parameters.messages.values;
    if (msgs) {
        msgs.forEach(v => {
            const field = v.message !== undefined ? 'message' : 'content';
            if (v[field] && v.role === 'system') {
                if (!v[field].includes('holistic narrative')) {
                    v[field] += '\n\nCRITICAL NARRATIVE INSTRUCTION: While you must strictly follow the structured brief, do NOT make the article feel like a disjointed list of disconnected sections. You must weave the sections together into a holistic narrative. Use seamless, logical transitions between H2 sections so the reader experiences a smooth, continuous flow from start to finish.';
                }
            }
        });
    }
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Successfully updated Keyword Strategist and Drafter for better narrative flow.');
