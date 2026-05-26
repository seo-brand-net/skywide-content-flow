/**
 * inject_qa_pipeline.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Upgrades "DEV Skywide Content (Word Count Fix).json" with:
 *
 *  Layer 1 — Brief Parser upgrade
 *    • Parse Creative Brief (LLM): now also extracts custom_rules + tone_instructions
 *    • Keyword Strategist v8: consumes custom_rules, injects global rules + brief rules
 *
 *  Layer 2 — QA + Conditional Rewrite pipeline (new nodes)
 *    • Structure Auditor (Pass 1)  → Structure Audit Gate
 *    • Surgical Rewriter (Claude)  ← triggered on audit fail
 *    • Structure Auditor (Pass 2)  → Structure Audit Gate 2
 *    • Flag For Human Review        ← triggered on second fail (still proceeds to scoring)
 *
 * Run: node inject_qa_pipeline.js
 */

const fs = require('fs');

const FILE = 'DEV Skywide Content (Word Count Fix).json';
console.log(`\n📂 Loading ${FILE}...`);
const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
console.log(`✅ Loaded. Nodes: ${data.nodes.length}`);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function findNode(name) {
  const n = data.nodes.find(n => n.name === name);
  if (!n) throw new Error(`❌ Node not found: "${name}"`);
  return n;
}

function findAnthropicCredential() {
  const node = data.nodes.find(n =>
    n.type === '@n8n/n8n-nodes-langchain.lmChatAnthropic' &&
    n.credentials?.anthropicApi
  );
  if (!node) throw new Error('❌ No Anthropic credential node found in workflow');
  return node.credentials.anthropicApi;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1A — Upgrade Parse Creative Brief (LLM) system prompt
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🔧 Layer 1A: Upgrading Parse Creative Brief (LLM)...');
const parserNode = findNode('Parse Creative Brief (LLM)');

parserNode.parameters.messages.values[0].content =
`You are an exact structural extraction component. Extract four things from the Creative Brief and return them as raw valid JSON with NO markdown wrapping and NO explanation.

Return ONLY this JSON structure:
{
  "headings": ["H2 heading 1", "H2 heading 2"],
  "faqs": [{"question": "Q1?", "answer": "A1 text"}],
  "custom_rules": ["Rule 1", "Rule 2"],
  "tone_instructions": "Tone description as a single string"
}

EXTRACTION RULES:

headings:
- Extract ONLY explicit H2 or H3 headings from the structural outline section.
- Do NOT include the H1 title.
- Look in sections labelled: "Content Structure", "Outline", "H2s:", "Sections:", "Headings:", "Content Outline & Writing Instructions".
- Preserve the exact heading text. Strip leading "H2:", "H3:", "##", "###", "-", "*" markers.

faqs:
- Extract from the FAQ or "Frequently Asked Questions" section only.
- Include answers if present. Use empty string for missing answers.
- Each entry: { "question": "...", "answer": "..." }

custom_rules:
- Extract any explicit writing instructions or constraints that are NOT headings or FAQs.
- Look in sections labelled: "Writing Instructions", "Style Notes", "Editorial Rules", "Content Notes", "Writing Guidelines", "Restrictions", "Do / Don't", "Important Notes".
- Also extract inline constraints anywhere in the brief that use directive language: "must", "do not", "always", "never", "avoid", "ensure", "should", "do NOT", "include", "exclude", "refrain".
- Each rule should be a self-contained instruction string.
- Extract up to 20 rules maximum.

tone_instructions:
- Extract the tone/voice directive as a single descriptive string.
- Look for: "Tone:", "Voice:", "Writing Style:", "Tone & Style:", "Tone of Voice:".
- If multiple tone descriptors exist, combine them into one string.
- Return empty string if no tone directive is found.

If any category yields no results, return an empty array [] or empty string "".`;

console.log('   ✅ System prompt updated to extract custom_rules + tone_instructions');

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1B — Upgrade Keyword Strategist to v8
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🔧 Layer 1B: Upgrading Keyword Strategist to v8...');
const strategistNode = findNode('Keyword Strategist');

const newStrategistCode = `// Instruction Strategist v8 — Bulletproof + Custom Rules + Global Enforcement
const input = $('Webhook1').first().json.body;

// ─── GLOBAL RULES: Always applied regardless of brief content ────────────────
const GLOBAL_RULES = [
  "Do NOT use AI-sounding filler phrases. Banned phrases: 'Additionally', 'Moreover', 'Furthermore', 'Let\\'s dive in', 'In conclusion', 'The bottom line', 'It\\'s worth noting', 'Dive into', 'In today\\'s world', 'Transitioning to'.",
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
    cleanedRAW = cleanedRAW.replace(/^[\\s\\S]*?\`\`\`json\\s*/, '').replace(/\`\`\`[\\s\\S]*$/, '').trim();
    cleanedRAW = cleanedRAW.replace(/^[\\s\\S]*?\`\`\`\\s*/, '').replace(/\`\`\`[\\s\\S]*$/, '').trim();
    const match = cleanedRAW.match(/\\{[\\s\\S]*\\}/);
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
  faqInjection = '### MANDATORY FAQS\\n\\nAt the end of the article include an FAQ section with EXACTLY these questions. If an answer is provided, incorporate that information into your answer — do not ignore it.\\n\\n';
  faqArray.forEach(faq => {
    faqInjection += \`**Q: \${faq.question}**\\n\`;
    if (faq.answer && faq.answer.trim()) {
      faqInjection += \`A: (Use this information in your answer: \${faq.answer})\\n\\n\`;
    } else {
      faqInjection += \`A: [Write a complete, accurate answer]\\n\\n\`;
    }
  });
}

// ─── STRUCTURE ENFORCEMENT (headings) ────────────────────────────────────────
const creativeBrief = input.creative_brief || '';
let briefEnforcerInjection = '';
if (creativeBrief) {
  briefEnforcerInjection = \`### CREATIVE BRIEF STRUCTURE (MANDATORY)

You MUST follow the structural outline below. Do not invent your own structure.

- Write the article conforming strictly to the content outline in the brief.
- Use the exact H2 headings specified — do not add, remove, or reorder them.
- Do NOT invent your own H2 headings if the outline already specifies them.

\`;
  if (briefHeadings.length > 0) {
    briefEnforcerInjection += \`MANDATORY HEADING ORDER — USE THESE EXACT H2s:\\n\`;
    briefHeadings.forEach((h, i) => {
      briefEnforcerInjection += \`\${i + 1}. \${h}\\n\`;
    });
    briefEnforcerInjection += \`\\nDo not add, remove, or reorder these headings.\\n\`;
  }
}

// ─── GLOBAL RULES INJECTION ───────────────────────────────────────────────────
const globalRulesInjection = \`### GLOBAL EDITORIAL RULES (NON-NEGOTIABLE)

These rules apply to every article regardless of the brief. Each violation is unacceptable:

\${GLOBAL_RULES.map((r, i) => \`\${i + 1}. \${r}\`).join('\\n')}
\`;

// ─── BRIEF-SPECIFIC CUSTOM RULES INJECTION ───────────────────────────────────
let customRulesInjection = '';
if (briefCustomRules.length > 0) {
  customRulesInjection = \`### BRIEF-SPECIFIC RULES (MANDATORY)

The following rules were explicitly specified in the creative brief. Every single one must be followed exactly:

\${briefCustomRules.map((r, i) => \`\${i + 1}. \${r}\`).join('\\n')}
\`;
}

// ─── TONE INJECTION ───────────────────────────────────────────────────────────
const toneSource = briefTone || input.tone || '';
let briefAuthorityPreamble = '';
if (toneSource) {
  briefAuthorityPreamble = \`Tone & Voice: \${toneSource}. Maintain this voice consistently from the first sentence to the last. Do not shift tone mid-article.\`;
}

// ─── CLIENT FIRST PARAGRAPH ───────────────────────────────────────────────────
let firstParagraphInjection = '';
if (input.client_name) {
  firstParagraphInjection = \`The opening paragraph MUST organically mention the client (\${input.client_name}) within the first two sentences. Do NOT use "the company", "the brand", or "they" as a substitute.\`;
}

// ─── SECONDARY / SEMANTIC KEYWORDS ───────────────────────────────────────────
let secondaryKeywordChecklist = '';
if (secondary.length > 0 || semantic.length > 0) {
  secondaryKeywordChecklist = '### SUPPLEMENTARY KEYWORDS (weave naturally — do not force):\\n';
  if (secondary.length > 0) {
    secondaryKeywordChecklist += 'Secondary Keywords:\\n' + secondary.map(k => '- ' + k).join('\\n') + '\\n\\n';
  }
  if (semantic.length > 0) {
    secondaryKeywordChecklist += 'Semantic Themes:\\n' + semantic.map(s => '- ' + s).join('\\n') + '\\n';
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
};`;

strategistNode.parameters.jsCode = newStrategistCode;
// Also update the file on disk for reference
fs.writeFileSync('src/n8n_scripts/keyword_strategist_ai.js', newStrategistCode);
console.log('   ✅ Keyword Strategist upgraded to v8');

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — QA + Conditional Rewrite Pipeline
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🔧 Layer 2: Injecting QA + Surgical Rewrite pipeline...');

const docExportNode  = findNode('Document Export Sanitization5');
const scoringAgent3  = findNode('1st Scoring Agent3');
const anthropicCred  = findAnthropicCredential();
const openAiCred     = { id: 'y3tVeuSKwYnV4Cyx', name: 'SEOBrand' };

const [baseX, baseY] = docExportNode.position;
const GAP = 250;

// New node IDs
const ID = {
  AUDITOR_1:       'qa-001-structure-auditor-p1',
  GATE_1:          'qa-002-audit-gate-p1',
  REWRITER:        'qa-003-surgical-rewriter',
  REWRITER_MODEL:  'qa-004-anthropic-rewriter-model',
  AUDITOR_2:       'qa-005-structure-auditor-p2',
  GATE_2:          'qa-006-audit-gate-p2',
  FLAG:            'qa-007-flag-for-review',
};

// Shared auditor system prompt
const AUDITOR_SYSTEM_PROMPT =
`You are a strict content structure auditor. Compare a generated article against required structure from a content brief. Return ONLY raw valid JSON — no markdown, no commentary.

JSON format:
{
  "headings_match": true,
  "faq_included": true,
  "rules_violated": ["specific violation 1", "specific violation 2"],
  "overall_pass": true,
  "correction_notes": "Precise surgical instructions to fix ONLY the issues found."
}

Rules:
- headings_match: true ONLY if ALL required headings appear in the article. Allow semantic equivalence — exact wording not required if meaning is identical.
- faq_included: true if required FAQ questions appear in an FAQ section. true if no FAQs were required.
- rules_violated: list ONLY actual violations of the brief-specific custom rules. Be specific about WHERE the violation occurs (e.g. "Rule 3 violated: Em-dash used in paragraph 2 of the 'Causes' section").
- overall_pass: true ONLY if headings_match=true AND faq_included=true AND rules_violated=[] (empty array).
- correction_notes: If overall_pass is false, write precise surgical instructions for a rewriter. Reference the exact location of each issue. If overall_pass is true, use empty string "".`;

// Shared auditor context builder (pass 1 — article from $json)
const AUDITOR_P1_USER_PROMPT =
`=REQUIRED HEADINGS:
{{ $('Keyword Strategist').first().json.detected_brief_headings?.length > 0 ? $('Keyword Strategist').first().json.detected_brief_headings.join('\\n') : 'No specific headings required — accept any structure.' }}

REQUIRED FAQ QUESTIONS:
{{ $('Keyword Strategist').first().json.detected_faqs?.length > 0 ? $('Keyword Strategist').first().json.detected_faqs.map(f => f.question).join('\\n') : 'No FAQs required.' }}

BRIEF-SPECIFIC CUSTOM RULES:
{{ $('Keyword Strategist').first().json.detected_custom_rules?.length > 0 ? $('Keyword Strategist').first().json.detected_custom_rules.join('\\n') : 'No brief-specific rules to check.' }}

GENERATED ARTICLE TO AUDIT:
{{ $json.content || $json.text || $json.message?.content || $json.output || '' }}`;

// Pass 2 — article from Surgical Rewriter
const AUDITOR_P2_USER_PROMPT =
`=REQUIRED HEADINGS:
{{ $('Keyword Strategist').first().json.detected_brief_headings?.length > 0 ? $('Keyword Strategist').first().json.detected_brief_headings.join('\\n') : 'No specific headings required.' }}

REQUIRED FAQ QUESTIONS:
{{ $('Keyword Strategist').first().json.detected_faqs?.length > 0 ? $('Keyword Strategist').first().json.detected_faqs.map(f => f.question).join('\\n') : 'No FAQs required.' }}

BRIEF-SPECIFIC CUSTOM RULES:
{{ $('Keyword Strategist').first().json.detected_custom_rules?.length > 0 ? $('Keyword Strategist').first().json.detected_custom_rules.join('\\n') : 'No brief-specific rules to check.' }}

CORRECTED ARTICLE TO AUDIT (post-rewrite):
{{ $('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || $('Surgical Rewriter').first().json.message?.content || '' }}`;

// ─── Node definitions ──────────────────────────────────────────────────────
const newNodes = [

  // Structure Auditor — Pass 1
  {
    id: ID.AUDITOR_1,
    name: 'Structure Auditor (Pass 1)',
    type: '@n8n/n8n-nodes-langchain.openAi',
    typeVersion: 1.8,
    position: [baseX + GAP, baseY],
    retryOnFail: true,
    credentials: { openAiApi: openAiCred },
    notes: 'Audits generated article structure vs brief. Returns JSON compliance report.',
    parameters: {
      modelId: { __rl: true, value: 'gpt-4o-mini', mode: 'list', cachedResultName: 'GPT-4o-mini' },
      messages: {
        values: [
          { content: AUDITOR_SYSTEM_PROMPT, role: 'system' },
          { content: AUDITOR_P1_USER_PROMPT }
        ]
      },
      options: { maxTokens: 1200, temperature: 0, responseFormat: 'json_object' }
    }
  },

  // Structure Audit Gate — Pass 1
  {
    id: ID.GATE_1,
    name: 'Structure Audit Gate',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [baseX + GAP * 2, baseY],
    notes: 'PASS → 1st Scoring Agent3 (happy path). FAIL → Surgical Rewriter.',
    parameters: {
      conditions: {
        options: { caseSensitive: false, typeValidation: 'loose', version: 2 },
        conditions: [{
          id: 'audit-gate-1-cond',
          leftValue: '={{ $json.message?.content?.overall_pass ?? $json.overall_pass ?? false }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'equals' }
        }],
        combinator: 'and'
      },
      options: {}
    }
  },

  // Anthropic Chat Model for Surgical Rewriter
  {
    id: ID.REWRITER_MODEL,
    name: 'Anthropic Rewriter Model',
    type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
    typeVersion: 1.3,
    position: [baseX + GAP * 3, baseY + 220],
    credentials: { anthropicApi: anthropicCred },
    parameters: {
      model: { __rl: true, value: 'claude-opus-4-5', mode: 'list', cachedResultName: 'claude-opus-4-5' },
      options: { temperature: 0.3, maxTokens: 8000 }
    }
  },

  // Surgical Rewriter (Claude via ChainLLM)
  {
    id: ID.REWRITER,
    name: 'Surgical Rewriter',
    type: '@n8n/n8n-nodes-langchain.chainLlm',
    typeVersion: 1.7,
    position: [baseX + GAP * 3, baseY],
    notes: 'Fixes ONLY the structural violations from the audit. Does not rewrite passing content.',
    parameters: {
      prompt: {
        messages: [{
          type: 'HumanMessagePromptTemplate',
          message: {
            content: `=You are a surgical content editor. You have a generated article and a precise list of structural violations. Fix ONLY the listed violations and return the COMPLETE corrected article.

CRITICAL RULES — READ CAREFULLY:
1. Fix ONLY the violations listed in CORRECTIONS NEEDED below. Touch nothing else.
2. Preserve ALL existing content, headings, and formatting that are not listed as violations.
3. Return the COMPLETE article with corrections applied — not just the changed sections.
4. Do NOT add any commentary, apology, or explanation. Return only the article text.
5. Do NOT add new sections, change the word count significantly, or restructure the article.

CORRECTIONS NEEDED:
{{ $('Structure Auditor (Pass 1)').first().json.message?.content?.correction_notes || $('Structure Auditor (Pass 1)').first().json.correction_notes || 'No specific corrections noted.' }}

ORIGINAL ARTICLE:
{{ $('Document Export Sanitization5').first().json.content || $('Document Export Sanitization5').first().json.text || $('Document Export Sanitization5').first().json.message?.content || '' }}`
          }
        }]
      },
      options: {}
    }
  },

  // Structure Auditor — Pass 2
  {
    id: ID.AUDITOR_2,
    name: 'Structure Auditor (Pass 2)',
    type: '@n8n/n8n-nodes-langchain.openAi',
    typeVersion: 1.8,
    position: [baseX + GAP * 4, baseY],
    retryOnFail: true,
    credentials: { openAiApi: openAiCred },
    notes: 'Second compliance check after surgical rewrite.',
    parameters: {
      modelId: { __rl: true, value: 'gpt-4o-mini', mode: 'list', cachedResultName: 'GPT-4o-mini' },
      messages: {
        values: [
          { content: AUDITOR_SYSTEM_PROMPT, role: 'system' },
          { content: AUDITOR_P2_USER_PROMPT }
        ]
      },
      options: { maxTokens: 1200, temperature: 0, responseFormat: 'json_object' }
    }
  },

  // Structure Audit Gate — Pass 2
  {
    id: ID.GATE_2,
    name: 'Structure Audit Gate 2',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [baseX + GAP * 5, baseY],
    notes: 'PASS → 1st Scoring Agent3. FAIL → Flag For Human Review (still proceeds to scoring).',
    parameters: {
      conditions: {
        options: { caseSensitive: false, typeValidation: 'loose', version: 2 },
        conditions: [{
          id: 'audit-gate-2-cond',
          leftValue: '={{ $json.message?.content?.overall_pass ?? $json.overall_pass ?? false }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'equals' }
        }],
        combinator: 'and'
      },
      options: {}
    }
  },

  // Flag For Human Review
  {
    id: ID.FLAG,
    name: 'Flag For Human Review',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [baseX + GAP * 6, baseY + 120],
    notes: 'Marks article as needing human review after 2 failed QA passes. Still routes to scoring.',
    parameters: {
      assignments: {
        assignments: [
          {
            id: 'flag-a',
            name: 'rewrite_flagged',
            value: true,
            type: 'boolean'
          },
          {
            id: 'flag-b',
            name: 'rewrite_flag_reason',
            value: "={{ $('Structure Auditor (Pass 2)').first().json.message?.content?.rules_violated?.join('; ') || 'Structure audit failed after 2 correction passes. Manual review required.' }}",
            type: 'string'
          },
          {
            id: 'flag-c',
            name: 'content',
            value: "={{ $('Surgical Rewriter').first().json.text || $('Surgical Rewriter').first().json.output || '' }}",
            type: 'string'
          }
        ]
      },
      options: {}
    }
  }

];

// Push all new nodes
data.nodes.push(...newNodes);
console.log(`   ✅ Added ${newNodes.length} new nodes`);

// ─────────────────────────────────────────────────────────────────────────────
// REWIRE CONNECTIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🔌 Rewiring connections...');

// 1. Break: Document Export Sanitization5 → 1st Scoring Agent3
//    Replace with: Document Export Sanitization5 → Structure Auditor (Pass 1)
const docExportConns = data.connections[docExportNode.name];
if (docExportConns?.main) {
  for (const outputGroup of docExportConns.main) {
    if (!outputGroup) continue;
    // Remove the direct link to 1st Scoring Agent3
    const removed = outputGroup.filter(t => t.node === scoringAgent3.name);
    const kept    = outputGroup.filter(t => t.node !== scoringAgent3.name);
    // Inject Structure Auditor (Pass 1) instead
    kept.push({ node: 'Structure Auditor (Pass 1)', type: 'main', index: 0 });
    outputGroup.length = 0;
    outputGroup.push(...kept);
    console.log(`   ↳ Removed ${removed.length} link(s) to 1st Scoring Agent3 from Document Export Sanitization5`);
  }
}

// 2. Connect LLM model to Surgical Rewriter (ai_languageModel port)
data.connections['Anthropic Rewriter Model'] = {
  ai_languageModel: [[{ node: 'Surgical Rewriter', type: 'ai_languageModel', index: 0 }]]
};

// 3. Structure Auditor (Pass 1) → Structure Audit Gate
data.connections['Structure Auditor (Pass 1)'] = {
  main: [[{ node: 'Structure Audit Gate', type: 'main', index: 0 }]]
};

// 4. Structure Audit Gate → [true] 1st Scoring Agent3 | [false] Surgical Rewriter
data.connections['Structure Audit Gate'] = {
  main: [
    [{ node: scoringAgent3.name, type: 'main', index: 0 }], // output 0 = true
    [{ node: 'Surgical Rewriter', type: 'main', index: 0 }] // output 1 = false
  ]
};

// 5. Surgical Rewriter → Structure Auditor (Pass 2)
data.connections['Surgical Rewriter'] = {
  main: [[{ node: 'Structure Auditor (Pass 2)', type: 'main', index: 0 }]]
};

// 6. Structure Auditor (Pass 2) → Structure Audit Gate 2
data.connections['Structure Auditor (Pass 2)'] = {
  main: [[{ node: 'Structure Audit Gate 2', type: 'main', index: 0 }]]
};

// 7. Structure Audit Gate 2 → [true] 1st Scoring Agent3 | [false] Flag For Human Review
data.connections['Structure Audit Gate 2'] = {
  main: [
    [{ node: scoringAgent3.name, type: 'main', index: 0 }],    // output 0 = true
    [{ node: 'Flag For Human Review', type: 'main', index: 0 }] // output 1 = false
  ]
};

// 8. Flag For Human Review → 1st Scoring Agent3 (always continues to scoring)
data.connections['Flag For Human Review'] = {
  main: [[{ node: scoringAgent3.name, type: 'main', index: 0 }]]
};

console.log('   ✅ All connections wired');

// ─────────────────────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────────────────────
const outputFile = FILE; // overwrite in-place
data.name = (data.name || 'DEV Skywide Content').replace(' + QA Pipeline', '') + ' + QA Pipeline';
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

console.log(`\n✅ DONE — Saved: ${outputFile}`);
console.log('\nSummary of changes:');
console.log('  Layer 1A │ Parse Creative Brief (LLM) → now extracts headings + faqs + custom_rules + tone_instructions');
console.log('  Layer 1B │ Keyword Strategist → v8 with global rules + custom rules injections');
console.log('  Layer 2  │ Structure Auditor (Pass 1) → Structure Audit Gate → [pass] scoring | [fail] Surgical Rewriter');
console.log('           │ Surgical Rewriter (Claude) → Structure Auditor (Pass 2) → Structure Audit Gate 2');
console.log('           │ → [pass] scoring | [fail] Flag For Human Review → scoring');
console.log('\n⚠  If claude-opus-4-5 is not available in your n8n, update Anthropic Rewriter Model to claude-opus-4-0 or claude-3-5-sonnet-20241022');
