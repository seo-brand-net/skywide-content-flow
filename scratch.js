// Instruction Strategist v6 — Optimized for performance
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
const primary = (Array.isArray(rawPrimary) ? rawPrimary.join(', ') : (rawPrimary || '')).trim();
const secondaryList = parseKeywords(input.secondary_keywords);       
const semanticList = parseKeywords(input.semantic_theme);
let wordCount = parseInt(input.word_count) || 1500;
const creativeBrief = (input.creative_brief || '').trim();
const clientName = (input.client_name || 'the client').trim();

// SMART WORD COUNT — Optimized regexes
if (creativeBrief) {
  // Use simplified, faster regex patterns
  const globalWcPatterns = [
    /target word count[:\s~]*([\d,]+)/i,
    /word count[:\s~]*([\d,]+)/i,
    /reading time[^\n]{0,50}?([\d,]+)\s*words/i, // bounded length
    /approximately ([\d,]+)\s*words/i,
    /~([\d,]+)\s*words?(?:\s+total|\s+for\s+the\s+(?:article|blog|post))?/i,
    /([\d,]+)[\s-]*word (?:article|blog|post|target)/i,
  ];
  let briefGlobalWc = 0;
  for (const pattern of globalWcPatterns) {
    const match = creativeBrief.match(pattern);
    if (match) {
      const parsed = parseInt(match[1].replace(/,/g, ''));
      if (parsed >= 200 && parsed <= 10000) { briefGlobalWc = parsed; break; }
    }
  }
  if (briefGlobalWc > 0) {
    wordCount = briefGlobalWc;
  } else {
    // Optimized section WC search
    const sectionWcPattern = /(?:~|\(|about\s*)(\d+)(?:\s*-\s*(\d+))?\s*words?/gi;
    let sectionTotal = 0, sectionCount = 0, sectionMatch;
    // Limit execution to avoid infinite loops on weird inputs
    let loopCount = 0;
    while ((sectionMatch = sectionWcPattern.exec(creativeBrief)) !== null && loopCount++ < 100) {
      const low = parseInt(sectionMatch[1]);
      const high = sectionMatch[2] ? parseInt(sectionMatch[2]) : low;
      const avg = Math.round((low + high) / 2);
      if (avg >= 50 && avg <= 500) { sectionTotal += avg; sectionCount++; }
    }
    if (sectionCount >= 2 && sectionTotal >= 300) { wordCount = sectionTotal; }
  }
}

const targetFreq = Math.max(3, Math.round((wordCount / 3200) * 8));

const allSecondary = [...secondaryList, ...semanticList].filter((v, i, a) => a.indexOf(v) === i);
const secondaryBlock = allSecondary.map((kw, i) => '   ' + (i+1) + '. "' + kw + '" — use at least once, naturally woven into a sentence').join('\n');

// ========== Parse Creative Brief for structural elements (OPTIMIZED) ==========
let briefFAQs = [];

const faqHeaderPatterns = [
  /FAQ\s*Section/i,
  /FAQ[s]?\s*[:(]/i,
  /Frequently\s+Asked\s+Questions/i
];

let faqSectionStart = -1;
for (const pattern of faqHeaderPatterns) {
  const match = creativeBrief.match(pattern);
  if (match) {
    faqSectionStart = match.index + match[0].length;
    break;
  }
}

if (faqSectionStart > -1) {
  const afterFaq = creativeBrief.substring(faqSectionStart, faqSectionStart + 2000); // look at max 2000 chars after faq header
  const lines = afterFaq.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const questions = [];
  for (const line of lines) {
    if (/^(H[2-4]|##|Meta|Title|Tone|Brand|Audience|Internal|CTA|Conclusion|Key\s*Takeaway)/i.test(line)) break;
    
    // Simpler string replacements instead of heavy regex replace
    let cleaned = line.trim();
    if (cleaned.startsWith('-') || cleaned.startsWith('*') || cleaned.startsWith('•')) {
      cleaned = cleaned.substring(1).trim();
    }
    // Remove leading numbers
    cleaned = cleaned.replace(/^\d+[.)\s]+/, '').trim();
    // Remove Q: prefix
    if (cleaned.toLowerCase().startsWith('q:')) {
      cleaned = cleaned.substring(2).trim();
    }
    
    if (cleaned.endsWith('?') && cleaned.length > 10) {
      questions.push(cleaned);
    }
  }
  if (questions.length > 0) briefFAQs = questions;
}

if (briefFAQs.length === 0) {
  const lines = creativeBrief.split('\n');
  const allQuestions = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.endsWith('?') && line.length > 15 && line.length < 200) { // Bound length
      let cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)\s]+/, '').replace(/^Q[:\s]+/i, '').trim();
      allQuestions.push(cleaned);
    }
  }
  if (allQuestions.length >= 2) {
    briefFAQs = allQuestions;
  }
}


let briefHeadings = [];
// Removed the catastrophic backtracking regexes ([\s\S]*?)
// Instead, just look line by line
const lines = creativeBrief.split('\n');
let inHeadingsSection = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!inHeadingsSection) {
    if (/^(H2[s]?|Headings?|Outline|Structure|Sections?)[:\s]*$/i.test(line)) {
      inHeadingsSection = true;
    }
  } else {
    // If empty line or next header, break
    if (line === '' && i < lines.length-1 && lines[i+1].trim() === '') break;
    if (line.length > 0 && !/^(H2[s]?|Headings?|Outline|Structure|Sections?)[:\s]*$/i.test(line)) {
      let cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)\s]+/, '').replace(/^H[23]:\s*/i, '').trim();
      if (cleaned.length > 3) briefHeadings.push(cleaned);
    }
  }
}

// ========== Build injection strings (unchanged logic, optimized assembly) ==========

const keywordInjection = `
### KEYWORD PLACEMENT RULES

**PRIMARY KEYWORD:** "${primary}"

WHERE TO PLACE IT (in order of importance):
1. H1 TITLE — Must contain the primary keyword as-is (exact wording)
2. FIRST 100 WORDS — Use it naturally within the opening paragraph
3. ONE H2 HEADING — Include it (or a very close variation) in one H2
4. FINAL PARAGRAPH — Reference it in the conclusion
5. BODY TEXT — Use it approximately ${targetFreq} times total across the article 

HOW TO USE IT NATURALLY:
- First use: exact match in a natural sentence
- After first use: you may use natural variations
- NEVER bold, italicize, or visually emphasize the keyword in body text
- NEVER force it into a sentence where it sounds awkward

DO vs DON'T:
YES: "When considering ${primary}, the most important factor is..."
YES: Use the keyword as part of a larger thought, not as a label
NO: "**${primary}** is important because..." (bolded, sounds like a label)       
NO: Starting 3+ sentences with the keyword phrase

**SECONDARY & SEMANTIC KEYWORDS (use each at least once):**
${secondaryBlock}

For question-form keywords: use them as a subheading or embed naturally like "Many people ask, [keyword]?"

**H2 HEADING STRATEGY (Surfer SEO best practice):**
- Each H2 should address a different subtopic or keyword family
- Use the primary keyword in max ONE H2
- Use secondary/semantic keywords or natural variations in other H2s
- H2s should read like useful section titles, not keyword dumps
`;

let secondaryChecklist = '';
if (allSecondary.length > 0) {
  secondaryChecklist = `
### SECONDARY & SEMANTIC KEYWORD CHECKLIST (MANDATORY)

You MUST include EVERY keyword listed below at least once in the article body. This is non-negotiable.
Before submitting, verify each one is present:

${allSecondary.map((kw, i) => '[ ] "' + kw + '" — MUST appear at least once').join('\n')}

FAILURE TO INCLUDE ANY OF THESE KEYWORDS IS A CRITICAL ERROR that will result in a failed quality score.
Do NOT rely only on the primary keyword. The secondary and semantic keywords are equally mandatory.
`;
}

const briefAuthorityPreamble = `
### HIERARCHY OF AUTHORITY (READ FIRST)

The Creative Brief is the HIGHEST AUTHORITY for this content. When any optimization rule, SEO suggestion, or style guideline CONFLICTS with specific instructions in the Creative Brief, the Creative Brief ALWAYS wins.

Specifically:
1. If the brief specifies H2 headings or an outline, you MUST use those exact headings. Do NOT invent your own outline.
2. If the brief specifies FAQs, you MUST use those exact FAQ questions verbatim. Do NOT substitute your own FAQs.
3. If the brief specifies paragraph lengths, section sizes, or specific word counts for sections, those override the global word count cap for that section.
4. If the brief requests specific elements (tables, comparison charts, numbered lists, case studies), you MUST include them.
5. If the brief specifies tone, angle, or approach, that overrides the default "friend giving advice" tone.

The global word count target applies to the MAIN BODY of the article. FAQs are ADDITIONAL to the main body word count.\n\nWORD COUNT IS A HARD CONSTRAINT. The target word count has been automatically calculated from the Creative Brief (either from its explicit total, or by summing its per-section targets). You MUST write to this target ±10%. Do NOT write 200 words less OR 200 words more than the target. Too short is as wrong as too long. The brief's word count always overrides any other guidance.

DO NOT let SEO optimization, EEAT enhancement, NLP optimization, or any other downstream improvement override the brief's explicit instructions.
`;

let faqInjection = '';
if (briefFAQs.length > 0) {
  faqInjection = `
### FAQ SECTION (MANDATORY — FROM CREATIVE BRIEF)

The Creative Brief provided the following FAQ questions. You MUST include ALL of them verbatim in an FAQ section at the end of the article.

**Use these EXACT questions (do not rephrase, reorder, or substitute):**
${briefFAQs.map((q, i) => (i+1) + '. ' + q).join('\n')}

Rules:
- Use the exact question text from the brief as H3 headings
- Write concise, helpful answers (2-4 sentences each)
- The FAQ section does NOT count toward the main body word count
- Do NOT add extra FAQs beyond what the brief specifies
- Do NOT remove or replace any of these FAQs
- Each FAQ answer should be 2-4 sentences, concise and helpful
- The FAQ section MUST appear at the END of the article, after the last H2 section
`;
}

let briefEnforcerInjection = '';
if (creativeBrief) {
  briefEnforcerInjection = `
### CREATIVE BRIEF STRUCTURE ENFORCEMENT (MANDATORY)

You MUST follow the structural outline and instructions provided in the Creative Brief below. Do not invent your own structure if an explicit outline is provided.

**Creative Brief Instructions:**
"""
${creativeBrief}
"""

**Strict Adherence Rules:**
- If the brief lists specific H2s or subheadings, you MUST use those exact subheadings (you may adjust wording slightly for SEO, but the topic of each section must match).
- If the brief specifies FAQs, you MUST use those exact FAQ questions verbatim. Do NOT substitute your own FAQs.
- If the brief specifies paragraph lengths, section sizes, or specific word counts for sections, those override the global word count cap for that section.
- If the brief requests specific elements (tables, comparison charts, numbered lists, case studies), you MUST include them.
- If the brief specifies tone, angle, or approach, that overrides the default "friend giving advice" tone.
- Maintain a logical hierarchy (H2 -> H3) without deviating from the brief's plan.
- When optimizing or rewriting, you may improve WITHIN the brief's structure but you may NOT replace the structure itself.

**CRITICAL — STRICT OUTLINE ADHERENCE:**
- You MUST follow the exact sequence of H2 sections provided in the brief. Do NOT invent or insert new H2 content sections that are not in the brief's outline.
- If the brief lists 6 H2 topics, your article must cover exactly those 6 H2 topics. No more, no less.
- The article structure and sections must perfectly mirror the provided brief.

**WORD COUNT PER SECTION:**
- If the brief specifies per-section word counts (e.g., "~100 words" per H2), those are your section budgets. Aim to hit each within ±25%.
- Always prioritize hitting the TOTAL word count target. If you need to write slightly more in a section to hit the total, do it.
- Do NOT treat per-section estimates as hard ceilings — they are pacing guides. A complete, useful section is always preferred over an artificially short one.
`;
} else {
  briefEnforcerInjection = `
### BRIEF STRUCTURE ENFORCEMENT

No explicit creative brief structure provided. Please use a logical H2/H3 structure appropriate for the topic.
`;
}

const eeatInjection = `
### EEAT FACTUAL ACCURACY & ZERO HALLUCINATION POLICY

You are writing a professional, publish-ready article. You MUST adhere to the following factual constraints:

1. **NO FAKE EXPERTS:** NEVER fabricate names of people, experts, doctors, or clients (e.g. no "Gregory V." or similar invented personas).
2. **NO FAKE DATA:** NEVER invent statistics, citations, research studies, or case studies.
3. **NO PLACEHOLDERS:** If a point logically requires a specific statistic, testimonial, or piece of data that is NOT provided in the creative brief, you MUST write around it naturally. NEVER use placeholders like [INSERT CLIENT STATISTIC] or [INSERT TESTIMONIAL]. The output must be 100% ready to publish and send to the client without them having to fill in the blanks.
4. **REPRESENT THE CLIENT:** Only use "${clientName}" when representing the company. Do not substitute vague phrases like "this company" or "the brand".
`;

const styleInjection = `
### VOICE & STYLE ENFORCEMENT (CONTRACTOR VOICE)

You must write like a grounded, knowledgeable consultant giving direct advice from the field. 

**Format Rules:**
- **Paragraphs MUST be short:** Maximum 2-3 sentences per paragraph. Use punchy, highly readable delivery. No dense UI blocks.

**Tone Rules:**
- Use natural speech: "I think," "Here's what works," "Honestly," "Look"
- Add parenthetical thoughts (we all do this) and natural rhetorical questions
- Disagree with common advice when you have better points; admit limitations

**BANNED PHRASES (NEVER USE THESE):**
- "Let's dive in" / "Let's explore" / "Let's delve"
- "In today's digital landscape" / "In the modern world"
- "The bottom line" / "In conclusion"
- "Furthermore" / "Additionally" / "Moreover"
- "Streamline" / "Leverage" / "Optimize"
- "You're Not Alone" / "It's important to note"
`;

return [{ json: {
  system_prompt_injection: keywordInjection,
  structure_prompt_injection: briefEnforcerInjection,
  eeat_prompt_injection: eeatInjection,
  style_prompt_injection: styleInjection,
  brief_authority_preamble: briefAuthorityPreamble,
  faq_injection: faqInjection,
  secondary_keyword_checklist: secondaryChecklist,
  brief_enforcer_injection: briefEnforcerInjection,
  keyword_strategy: {
    system_prompt_injection: keywordInjection
  },
  primary_keyword: primary,
  secondary_keywords: allSecondary,
  target_frequency: targetFreq,
  detected_brief_faqs: briefFAQs,
  detected_brief_headings: briefHeadings
}}];
