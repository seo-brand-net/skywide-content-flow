/**
 * fix_all_references.js
 *
 * Fixes every broken node reference in the workflow:
 * 1. Pre-Draft Fact Checker user message → point to raw creative brief from webhook
 * 2. Keyword Strategist code → add system_prompt_injection, eeat_prompt_injection,
 *    style_prompt_injection, structure_prompt_injection to return object,
 *    wrapping the fact_check_report and all guardrails
 * 3. Verify expression prefixes are set on affected nodes
 */

const fs = require('fs');
const FILE = 'TEST Skywide Content (Prompt Review).json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let changes = 0;

// ── 1. Fix Pre-Draft Fact Checker user message ────────────────────────────────
// It currently references Parse Creative Brief (LLM).item.json.text which is
// (a) wrong output field and (b) wrong node — it should read the raw creative brief
const preChecker = data.nodes.find(n => n.name === 'Pre-Draft Fact Checker');
if (preChecker) {
  const msgs = preChecker.parameters.messages.message;
  const userMsg = msgs.find(m => m.role !== 'system');
  if (userMsg && userMsg.content.includes("Parse Creative Brief (LLM)")) {
    // Replace with direct webhook creative brief reference
    userMsg.content = "=Brief Data to Audit:\n{{ $('Webhook1').first().json.body.creative_brief }}";
    // Ensure expression prefix on system message too
    const sysMsg = msgs.find(m => m.role === 'system');
    if (sysMsg && !sysMsg.content.startsWith('=')) {
      sysMsg.content = '=' + sysMsg.content;
    }
    changes++;
    console.log('✅ Fixed: Pre-Draft Fact Checker user message → now references creative_brief from Webhook1');
  } else if (userMsg) {
    // Make sure it has the = prefix
    if (!userMsg.content.startsWith('=')) {
      userMsg.content = '=' + userMsg.content;
      changes++;
      console.log('✅ Fixed: Pre-Draft Fact Checker user message → added expression prefix');
    } else {
      console.log('ℹ️  Pre-Draft Fact Checker user message already correct');
    }
  }
}

// ── 2. Fix Keyword Strategist → add missing output fields ────────────────────
// The node currently returns fact_check_report but NOT system_prompt_injection,
// eeat_prompt_injection, style_prompt_injection, or structure_prompt_injection.
// Every draft node references these, so they silently resolve to undefined.
const ks = data.nodes.find(n => n.name === 'Keyword Strategist');
if (ks) {
  let code = ks.parameters.jsCode || ks.parameters.code || '';

  if (!code.includes('system_prompt_injection')) {

    // Build the system_prompt_injection block that wraps all guardrails + fact check report
    const injectionBlock = `
// ── Build system_prompt_injection (fact check + guardrails) ──────────────────
// This is the primary injection point for factual constraints in the drafting nodes.
// It wraps the Pre-Draft Fact Checker report and all editorial guardrails.

let systemPromptInjection = '';

if (factCheckReport && factCheckReport.length > 50) {
  systemPromptInjection += \`
⚠️ PRE-VERIFIED FACTS MANIFEST — MANDATORY CONSTRAINTS ⚠️
The following fact-check report was produced by a primary source verification agent.
You MUST follow these constraints when drafting:

\${factCheckReport}

CRITICAL USAGE RULES:
- Claims marked VERIFIED: Use the exact figures and attributions provided.
- Claims marked UNVERIFIED or REMOVE: Do NOT include them. Use qualitative language instead (e.g. "research suggests" or "studies indicate").
- Do NOT introduce any new statistics, percentages, or quantified claims not in this report.
\`;
}

systemPromptInjection += \`

MANDATORY OUTPUT STRUCTURE:
- Line 1 of your response MUST be: Meta Title: [title here]
- Line 2 MUST be: Meta Description: [description here]
- The main article title MUST use a single # (H1). Never start with ##.
- Include an FAQ section if the brief specifies one.

FORBIDDEN PHRASES — NEVER USE THESE:
- "you're not alone" / "you are not alone"
- "you might be surprised"
- "it's worth noting" / "it is worth noting"
- "needless to say"
- "as you may know"
- "in today's world" / "in today's fast-paced world"
- "our patients report" / "we've seen patients" / "some of our patients"
- Any fabricated clinical anecdote or testimonial unless a direct quote is in the brief
- "we've seen [X]% improvement" or "we've watched clients achieve" unless a cited source is provided

CITATION INTEGRITY:
- Every cited source MUST match its label exactly. Do NOT relabel a paper with a different title.
- If a statistic cannot be traced to an independent primary source, use qualitative language.
- Mechanism of action, serum changes, and clinical response rates are DISTINCT medical concepts — keep them separate.
\`;

const eeatPromptInjection = \`
### E-E-A-T SIGNALS:
Demonstrate Experience, Expertise, Authoritativeness, and Trustworthiness by:
- Citing real, named primary sources (government agencies, peer-reviewed studies, professional associations)
- Using precise, measured language rather than superlatives
- Acknowledging limitations of evidence where appropriate
- Attributing claims to specific organizations or studies, not vague "experts say"
\`;

const stylePromptInjection = \`
### TONE & STYLE:
- Write in a clear, direct, and professional tone
- Avoid generic AI-sounding openers and closers
- Do not pad the article with filler sentences
- Use active voice wherever possible
\`;

const structurePromptInjection = \`
### STRUCTURAL REQUIREMENTS:
- Meta Title and Meta Description MUST appear on the first two lines
- Use # for the article H1 title (only one H1 per article)
- Use ## for major sections and ### for subsections
- Conclude with an FAQ section if specified in the brief
\`;
`;

    // Inject the new block just before the `return {` statement
    code = code.replace(
      'return {\n  json: {',
      injectionBlock + '\nreturn {\n  json: {'
    );

    // Add the new fields to the return object
    code = code.replace(
      '    detected_faqs: faqArray\n  }\n};',
      `    detected_faqs: faqArray,
    system_prompt_injection: systemPromptInjection,
    eeat_prompt_injection: eeatPromptInjection,
    style_prompt_injection: stylePromptInjection,
    structure_prompt_injection: structurePromptInjection
  }
};`
    );

    // Write back
    if (ks.parameters.jsCode !== undefined) {
      ks.parameters.jsCode = code;
    } else {
      ks.parameters.code = code;
    }

    changes++;
    console.log('✅ Fixed: Keyword Strategist → added system_prompt_injection, eeat_prompt_injection, style_prompt_injection, structure_prompt_injection');
  } else {
    console.log('ℹ️  Keyword Strategist already has system_prompt_injection');
  }
}

// ── 3. Verify Post-Draft Fact Checker references are correct ─────────────────
const postChecker = data.nodes.find(n => n.name === 'Post-Draft Fact Checker');
if (postChecker) {
  const msgs = postChecker.parameters.messages.message;
  // System prompt should already be correct, just ensure expression prefix
  msgs.forEach(m => {
    if (m.content && !m.content.startsWith('=') && (m.content.includes('{{') || m.content.includes("$("))) {
      m.content = '=' + m.content;
      changes++;
      console.log('✅ Fixed: Post-Draft Fact Checker message → added expression prefix');
    }
  });
}

// ── 4. Also ensure the fact_check_report is injected into the Post-Draft checker ──
// Post-Draft checker should receive BOTH the brief AND the fact_check_report
// so it can cross-check what the Pre-Draft checker approved
if (postChecker) {
  const msgs = postChecker.parameters.messages.message;
  const userMsg = msgs.find(m => m.role !== 'system');
  if (userMsg && !userMsg.content.includes('fact_check_report') && !userMsg.content.includes('PRE-VERIFIED')) {
    // Append the fact_check_report to the Post-Draft user message
    const currentContent = userMsg.content.startsWith('=')
      ? userMsg.content
      : '=' + userMsg.content;

    userMsg.content = currentContent.trimEnd() + `

PRE-DRAFT FACT CHECKER REPORT (treat claims listed here as ground truth):
{{ $('Keyword Strategist').first().json.fact_check_report }}`;
    changes++;
    console.log('✅ Fixed: Post-Draft Fact Checker → now receives fact_check_report from Keyword Strategist for cross-checking');
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
console.log(`\nTotal changes made: ${changes}`);
console.log('✅ Saved:', FILE);
console.log('\nNext: Re-import this workflow JSON into n8n and re-run the test.');
