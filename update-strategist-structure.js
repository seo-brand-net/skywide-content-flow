/**
 * Step 1: Update Keyword Strategist to extract Structure from Creative Brief
 */
const fs = require('fs');
const path = require('path');

const FILE = 'DEV Skywide  Content (TEST v23).json';
const filePath = path.join(__dirname, FILE);

console.log('Reading workflow file...');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let updated = false;

data.nodes.forEach((n, idx) => {
    if (n.name === 'Keyword Strategist' && n.type === 'n8n-nodes-base.code') {
        let code = n.parameters.jsCode;

        // Check if we already injected structure logic
        if (!code.includes('structure_prompt_injection')) {

            const newCode = `// Keyword Strategist v4 — Expert-grounded keywords + Brief-driven structure
const input = $('Webhook1').first().json.body;

function parseKeywords(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

const primary = (input.primary_keywords || '').trim();
const secondaryList = parseKeywords(input.secondary_keywords);       
const semanticList = parseKeywords(input.semantic_theme);
const wordCount = parseInt(input.word_count) || 1500;
const creativeBrief = (input.creative_brief || '').trim();

// Calculate target frequency (Backlinko: ~8 per 3200 words, scaled)
const targetFreq = Math.max(3, Math.round((wordCount / 3200) * 8));

// Build secondary block
const allSecondary = [...secondaryList, ...semanticList]
  .filter((v, i, a) => a.indexOf(v) === i);

const secondaryBlock = allSecondary
  .map((kw, i) => '   ' + (i+1) + '. "' + kw + '" — use at least once, naturally woven into a sentence')
  .join('\\n');

const keywordInjection = \`
### KEYWORD PLACEMENT RULES

**PRIMARY KEYWORD:** "\${primary}"

WHERE TO PLACE IT (in order of importance):
1. H1 TITLE — Must contain the primary keyword as-is (exact wording)
2. FIRST 100 WORDS — Use it naturally within the opening paragraph
3. ONE H2 HEADING — Include it (or a very close variation) in one H2
4. FINAL PARAGRAPH — Reference it in the conclusion
5. BODY TEXT — Use it approximately \${targetFreq} times total across the article 

HOW TO USE IT NATURALLY:
- First use: exact match in a natural sentence
- After first use: you may use natural variations
- NEVER bold, italicize, or visually emphasize the keyword in body text
- NEVER force it into a sentence where it sounds awkward

DO vs DON'T:
YES: "When considering \${primary}, the most important factor is..."
YES: Use the keyword as part of a larger thought, not as a label
NO: "**\${primary}** is important because..." (bolded, sounds like a label)       
NO: Starting 3+ sentences with the keyword phrase

**SECONDARY & SEMANTIC KEYWORDS (use each at least once):**
\${secondaryBlock}

For question-form keywords: use them as a subheading or embed naturally like "Many people ask, [keyword]?"

**H2 HEADING STRATEGY (Surfer SEO best practice):**
- Each H2 should address a different subtopic or keyword family
- Use the primary keyword in max ONE H2
- Use secondary/semantic keywords or natural variations in other H2s
- H2s should read like useful section titles, not keyword dumps
\`;

let structureInjection = '';
if (creativeBrief) {
  structureInjection = \`
### BRIEF STRUCTURE ENFORCEMENT

You MUST follow the structural outline and instructions provided in the Creative Brief below. Do not invent your own structure if an explicit outline is provided.

**Creative Brief Instructions:**
"""
\${creativeBrief}
"""

**Strict Adherence Rules:**
- If the brief lists specific H2s or subheadings, you MUST use those exact subheadings.
- If the brief dictates specific elements (like a bulleted list of symptoms, a comparison table, or FAQs), you MUST include them exactly as requested.
- Maintain a logical hierarchy (H2 -> H3) without deviating from the brief's plan.
- Maximum 3-4 sentences per paragraph. Short, punchy sentences for readability.
\`;
} else {
  structureInjection = \`
### BRIEF STRUCTURE ENFORCEMENT

No explicit creative brief structure provided. Please use a logical H2/H3 structure appropriate for the topic.
- Maximum 3-4 sentences per paragraph. Short, punchy sentences for readability.
\`;
}

return [{ json: {
  system_prompt_injection: keywordInjection,
  structure_prompt_injection: structureInjection,
  primary_keyword: primary,
  secondary_keywords: allSecondary,
  target_frequency: targetFreq
}}];
`;
            n.parameters.jsCode = newCode;
            updated = true;
            console.log(`✅ Updated Keyword Strategist (index ${idx})`);
        } else {
            console.log('Keyword Strategist already updated with structure logic.');
        }
    }
});

if (updated) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('\n✅ Done! File saved.');
} else {
    console.log('No changes made.');
}
