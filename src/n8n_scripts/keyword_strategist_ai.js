// Instruction Strategist v8 — Bulletproof + Custom Rules + Global Enforcement
const input = $('Webhook1').first().json.body;

// ─── GLOBAL RULES: Always applied regardless of brief content ────────────────
const GLOBAL_RULES = [
  "Do NOT use AI-sounding filler phrases. Banned phrases: 'Additionally', 'Moreover', 'Furthermore', 'Let\'s dive in', 'In conclusion', 'The bottom line', 'It\'s worth noting', 'Dive into', 'In today\'s world', 'Transitioning to'.",
  "Write in active voice. Do not use passive voice constructions.",
  "Keep paragraphs to 2–3 sentences maximum. Long paragraphs must be broken up.",
  "Do not invent statistics, research studies, or expert names. If a specific figure is needed but not provided, write [Data Needed] as a placeholder.",
  "Do not use em-dashes (—). Replace with commas, colons, or restructured sentences.",
  "Do not use generic CTAs like 'Click here' or 'Learn more'. CTAs must be specific and action-oriented.",
  "Every H2 section must contain at least 2 substantive paragraphs. No single-sentence sections.",
  "Do not repeat the same phrase or sentence structure in consecutive paragraphs.",
  "Bold text (**bold**) should be used sparingly — only for genuinely critical terms, not for stylistic emphasis.",
];

function parseKeywords(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap(item => item.split(',').map(k => k.trim())).filter(k => k.length > 0);
  }
  if (typeof raw !== 'string') return [];
  return raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

const rawPrimary = input.primary_keywords;
const primary = (Array.isArray(rawPrimary) ? rawPrimary.join(', ') : rawPrimary) || '';
const secondary = parseKeywords(input.secondary_keywords);
const semantic = parseKeywords(input.semantic_themes);

// ─── EXTRACT AI PARSED BRIEF DATA ────────────────────────────────────────────
let aiOutputRAW = $('Parse Creative Brief (LLM)').first().json.message?.content
               || $('Parse Creative Brief (LLM)').first().json.text
               || $('Parse Creative Brief (LLM)').first().json.choices?.[0]?.message?.content
               || '{}';

let aiData = { headings: [], faqs: [], custom_rules: [], tone_instructions: '' };
try {
  if (typeof aiOutputRAW === 'object' && aiOutputRAW !== null) {
    aiData = { headings: [], faqs: [], custom_rules: [], tone_instructions: '', ...aiOutputRAW };
  } else if (typeof aiOutputRAW === 'string') {
    let cleanedRAW = aiOutputRAW;
    cleanedRAW = cleanedRAW.replace(/^[\s\S]*?```json\s*/, '').replace(/```[\s\S]*$/, '').trim();
    cleanedRAW = cleanedRAW.replace(/^[\s\S]*?```\s*/, '').replace(/```[\s\S]*$/, '').trim();
    const match = cleanedRAW.match(/\{[\s\S]*\}/);
    if (match) cleanedRAW = match[0];
    const parsed = JSON.parse(cleanedRAW);
    aiData = { headings: [], faqs: [], custom_rules: [], tone_instructions: '', ...parsed };
  }
} catch (e) {
  console.log('Brief parser JSON parse failed:', e.message);
}

const briefHeadings     = Array.isArray(aiData.headings)      ? aiData.headings      : [];
const faqArray          = Array.isArray(aiData.faqs)          ? aiData.faqs          : [];
const briefCustomRules  = Array.isArray(aiData.custom_rules)  ? aiData.custom_rules  : [];
const briefTone         = typeof aiData.tone_instructions === 'string' ? aiData.tone_instructions : '';

// ─── FAQ INJECTION ────────────────────────────────────────────────────────────
let faqInjection = '';
if (faqArray.length > 0) {
  faqInjection = '### MANDATORY FAQS\n\nAt the end of the article include an FAQ section with EXACTLY these questions. If an answer is provided, incorporate that information into your answer — do not ignore it.\n\n';
  faqArray.forEach(faq => {
    faqInjection += `**Q: ${faq.question}**\n`;
    if (faq.answer && faq.answer.trim()) {
      faqInjection += `A: (Use this information in your answer: ${faq.answer})\n\n`;
    } else {
      faqInjection += `A: [Write a complete, accurate answer]\n\n`;
    }
  });
}

// ─── STRUCTURE ENFORCEMENT (headings) ────────────────────────────────────────
const creativeBrief = input.creative_brief || '';
let briefEnforcerInjection = '';
if (creativeBrief) {
  briefEnforcerInjection = `### CREATIVE BRIEF STRUCTURE (MANDATORY)

You MUST follow the structural outline below. Do not invent your own structure.

- Write the article conforming strictly to the content outline in the brief.
- Use the exact H2 headings specified — do not add, remove, or reorder them.
- Do NOT invent your own H2 headings if the outline already specifies them.

`;
  if (briefHeadings.length > 0) {
    briefEnforcerInjection += `MANDATORY HEADING ORDER — USE THESE EXACT H2s:\n`;
    briefHeadings.forEach((h, i) => {
      briefEnforcerInjection += `${i + 1}. ${h}\n`;
    });
    briefEnforcerInjection += `\nDo not add, remove, or reorder these headings.\n`;
  }
}

// ─── GLOBAL RULES INJECTION ───────────────────────────────────────────────────
const globalRulesInjection = `### GLOBAL EDITORIAL RULES (NON-NEGOTIABLE)

These rules apply to every article regardless of the brief. Each violation is unacceptable:

${GLOBAL_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;

// ─── BRIEF-SPECIFIC CUSTOM RULES INJECTION ───────────────────────────────────
let customRulesInjection = '';
if (briefCustomRules.length > 0) {
  customRulesInjection = `### BRIEF-SPECIFIC RULES (MANDATORY)

The following rules were explicitly specified in the creative brief. Every single one must be followed exactly:

${briefCustomRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;
}

// ─── TONE INJECTION ───────────────────────────────────────────────────────────
const toneSource = briefTone || input.tone || '';
let briefAuthorityPreamble = '';
if (toneSource) {
  briefAuthorityPreamble = `Tone & Voice: ${toneSource}. Maintain this voice consistently from the first sentence to the last. Do not shift tone mid-article.`;
}

// ─── CLIENT FIRST PARAGRAPH ───────────────────────────────────────────────────
let firstParagraphInjection = '';
if (input.client_name) {
  firstParagraphInjection = `The opening paragraph MUST organically mention the client (${input.client_name}) within the first two sentences. Do NOT use "the company", "the brand", or "they" as a substitute.`;
}

// ─── SECONDARY / SEMANTIC KEYWORDS ───────────────────────────────────────────
let secondaryKeywordChecklist = '';
if (secondary.length > 0 || semantic.length > 0) {
  secondaryKeywordChecklist = '### SUPPLEMENTARY KEYWORDS (weave naturally — do not force):\n';
  if (secondary.length > 0) {
    secondaryKeywordChecklist += 'Secondary Keywords:\n' + secondary.map(k => '- ' + k).join('\n') + '\n\n';
  }
  if (semantic.length > 0) {
    secondaryKeywordChecklist += 'Semantic Themes:\n' + semantic.map(s => '- ' + s).join('\n') + '\n';
  }
}

return {
  json: {
    primary_keyword_joined:         primary,
    secondary_keywords_arr:         secondary,
    semantic_themes_arr:            semantic,
    brief_enforcer_injection:       briefEnforcerInjection,
    faq_injection:                  faqInjection,
    global_rules_injection:         globalRulesInjection,
    custom_rules_injection:         customRulesInjection,
    first_paragraph_client_injection: firstParagraphInjection,
    secondary_keyword_checklist:    secondaryKeywordChecklist,
    brief_authority_preamble:       briefAuthorityPreamble,
    detected_brief_headings:        briefHeadings,
    detected_faqs:                  faqArray,
    detected_custom_rules:          briefCustomRules,
  }
};