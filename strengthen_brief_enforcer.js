/**
 * strengthen_brief_enforcer.js
 * Updates the Keyword Strategist node in DEV to strictly enforce the creative brief structure.
 */

const fs = require('fs');
const DEV_FILE  = 'DEV Skywide Content (Word Count Fix).json';

const dev  = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'));

let changes = 0;

const ksDev = dev.nodes.find(n => n.name === 'Keyword Strategist');
if (ksDev) {
  const codeKey = ksDev.parameters.jsCode !== undefined ? 'jsCode' : 'code';
  let code = ksDev.parameters[codeKey] || '';

  // The old string to replace
  const oldEnforcer = `
### CREATIVE BRIEF STRUCTURE ENFORCEMENT (MANDATORY)

You MUST follow the structural outline and instructions provided in the Creative Brief below. Do not invent your own structure if an explicit outline is provided.

CRITICAL INSTRUCTIONS:
- You must write the article conforming strictly to the "Content Outline & Writing Instructions" or similar structural outline section provided in the brief.
- If the brief lists specific H2s or subheadings, you MUST use those exact subheadings in your response.
- Do NOT invent your own H2s if the outline already specifies them.

\`;

  if (briefHeadings.length > 0) {
    briefEnforcerInjection += \`\\nWe have automatically parsed the requested outline bindings. YOU MUST USE THESE EXACT HEADINGS:\\n\`;
    briefHeadings.forEach((h, i) => {
        briefEnforcerInjection += \`\${i + 1}. \${h}\\n\`;
    });
    briefEnforcerInjection += \`\\nDo not deviate from these boundaries.\\n\`;
  }`;

  // The new strict string
  const newEnforcer = `
### 🚨 STRICT CREATIVE BRIEF ENFORCEMENT 🚨

You are an exact-match structural formatter. You MUST follow the outline provided in the Creative Brief below with absolute precision. DO NOT deviate.

CRITICAL STRUCTURAL INSTRUCTIONS:
1. HEADINGS (H2/H3): You must use ONLY the H2s and H3s explicitly listed in the brief. Do NOT invent your own H2s. Do NOT rephrase them.
2. LISTS & FORMATTING: If the brief asks for a numbered list, step-by-step guide, or specific formatting (e.g., "H3: Step 1"), you MUST output exactly that format. Do not convert lists into standard paragraphs.
3. LEAD PARAGRAPH / HOOK: If the brief provides a "Suggested Lead Paragraph" or "AI Overview Hook", you MUST use it exactly or paraphrase it extremely closely as your opening paragraph.
4. META & H1: If the brief dictates a specific Meta Title, Meta Description, or H1, you must use EXACTLY the text provided.

\`;

  if (briefHeadings.length > 0) {
    briefEnforcerInjection += \`\\nWe have automatically parsed the requested outline bindings. YOU MUST USE THESE EXACT HEADINGS (in order):\\n\`;
    briefHeadings.forEach((h, i) => {
        briefEnforcerInjection += \`\${i + 1}. \${h}\\n\`;
    });
    briefEnforcerInjection += \`\\n⛔ DO NOT add any extra H2s that are not on this list. DO NOT deviate from these boundaries. ⛔\\n\`;
  }`;

  // Ensure we are matching the correct block
  if (code.includes('CREATIVE BRIEF STRUCTURE ENFORCEMENT (MANDATORY)')) {
     code = code.replace(oldEnforcer, newEnforcer);
     ksDev.parameters[codeKey] = code;
     changes++;
     console.log('✅ Upgraded briefEnforcerInjection in Keyword Strategist');
  } else {
     console.log('⚠️ Could not find the target code block to replace.');
  }

}

if (changes > 0) {
    fs.writeFileSync(DEV_FILE, JSON.stringify(dev, null, 2), 'utf8');
    console.log('\\n✅ Saved changes to', DEV_FILE);
    console.log('Next: Re-import the updated DEV workflow into n8n.');
} else {
    console.log('\\n❌ No changes made.');
}
