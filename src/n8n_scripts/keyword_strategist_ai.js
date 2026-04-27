// Instruction Strategist v7 (AI Powered) — Bulletproof Structural Extraction
const input = $('Webhook1').first().json.body;

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

// EXTRACT AI PARSED JSON FROM PREVIOUS NODE
// Depending on n8n version, Langchain OpenAI nodes output to message.content or choices[0]
let aiOutputRAW = $('Parse Creative Brief (LLM)').first().json.message?.content 
               || $('Parse Creative Brief (LLM)').first().json.text 
               || $('Parse Creative Brief (LLM)').first().json.choices?.[0]?.message?.content 
               || '{}';
               
let aiData = { headings: [], faqs: [] };
try {
    aiData = JSON.parse(aiOutputRAW);
} catch(e) {
    console.log("Failed to parse AI node output", e);
}

const briefHeadings = aiData.headings || [];
const faqArray = aiData.faqs || [];

let faqInjection = '';
if (faqArray.length > 0) {
  faqInjection = '### MANDATORY FAQS TO INCLUDE\n\nAt the end of the article, you MUST include an FAQ section incorporating exactly these questions and answers if provided.\n\n';
  faqArray.forEach(faq => {
    faqInjection += `- Q: ${faq.question}\n`;
    if (faq.answer && faq.answer.trim() !== '') {
      faqInjection += `  A: (Incorporate this information into your answer: ${faq.answer})\n`;
    }
  });
}

const creativeBrief = input.creative_brief || '';
let briefEnforcerInjection = '';

if (creativeBrief) {
  briefEnforcerInjection = `
### CREATIVE BRIEF STRUCTURE ENFORCEMENT (MANDATORY)

You MUST follow the structural outline and instructions provided in the Creative Brief below. Do not invent your own structure if an explicit outline is provided.

CRITICAL INSTRUCTIONS:
- You must write the article conforming strictly to the "Content Outline & Writing Instructions" or similar structural outline section provided in the brief.
- If the brief lists specific H2s or subheadings, you MUST use those exact subheadings in your response.
- Do NOT invent your own H2s if the outline already specifies them.

`;

  if (briefHeadings.length > 0) {
    briefEnforcerInjection += `\nWe have automatically parsed the requested outline bindings. YOU MUST USE THESE EXACT HEADINGS:\n`;
    briefHeadings.forEach((h, i) => {
        briefEnforcerInjection += `${i + 1}. ${h}\n`;
    });
    briefEnforcerInjection += `\nDo not deviate from these boundaries.\n`;
  }
}

// Ensure first paragraph injection
let firstParagraphInjection = '';
if (input.client_name) {
  firstParagraphInjection = `The opening paragraph MUST organically mention the client (${input.client_name}) within the first two sentences. Do NOT substitute the company name with "the company" or "the brand."`;
}

// Optional secondary/semantic keyword injection
let secondaryKeywordChecklist = '';
if (secondary.length > 0 || semantic.length > 0) {
  secondaryKeywordChecklist = '### SUPPLEMENTARY KEYWORDS TO WEAVE NATURALLY:\n';
  if (secondary.length > 0) {
    secondaryKeywordChecklist += 'Secondary Keywords:\n' + secondary.map(k => '- ' + k).join('\n') + '\n\n';
  }
  if (semantic.length > 0) {
    secondaryKeywordChecklist += 'Semantic Themes:\n' + semantic.map(sem => '- ' + sem).join('\n') + '\n';
  }
}

let briefAuthorityPreamble = '';
if (input.tone) {
  briefAuthorityPreamble = `The tone of this article should strictly be: ${input.tone}. Ensure the voice remains authentic.`;
}

return {
  json: {
    primary_keyword_joined: primary,
    secondary_keywords_arr: secondary,
    semantic_themes_arr: semantic,
    brief_enforcer_injection: briefEnforcerInjection,
    faq_injection: faqInjection,
    first_paragraph_client_injection: firstParagraphInjection,
    secondary_keyword_checklist: secondaryKeywordChecklist,
    brief_authority_preamble: briefAuthorityPreamble,
    detected_brief_headings: briefHeadings,
    detected_faqs: faqArray
  }
};