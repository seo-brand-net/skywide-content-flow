/**
 * fix_meta_and_citations.js
 *
 * Fixes two remaining issues:
 * 1. Meta Title/Description stripping — adds a structural lock to ALL downstream
 *    nodes that process article text so they never drop those lines.
 * 2. PMC citation label fabrication — adds citation label verification to the
 *    Post-Draft Fact Checker so it actively checks that source labels match
 *    the actual paper titles at those URLs.
 */

const fs = require('fs');
const FILE = 'TEST Skywide Content (Prompt Review).json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let changes = 0;

// ── The Meta Title structural lock to inject ──────────────────────────────────
const META_LOCK = `

⛔ STRUCTURAL LOCK — META TAGS MUST BE PRESERVED ⛔
The very first lines of the article MUST begin with:
Meta Title: [title here]
Meta Description: [description here]

These are NOT meta-commentary. They are mandatory deliverable fields required by the CMS.
- If they are present in the input, KEEP THEM EXACTLY on line 1 and line 2.
- If they are missing from the input, ADD THEM before outputting.
- NEVER remove, reformat, or move these two lines.
- Your output must start with "Meta Title:" — no preamble, no intro sentence before it.
`;

// ── Citation verification rule for Post-Draft Fact Checker ───────────────────
const CITATION_VERIFY = `

⛔ CITATION LABEL VERIFICATION — MANDATORY ⛔
For every source in the Cited Sources / References section:
1. The label/title you assign MUST match the actual title of the paper or page at that URL.
2. Do NOT relabel a paper with a different title to make it appear relevant to a different topic.
3. PMC/PubMed entries (pmc.ncbi.nlm.nih.gov/articles/PMCXXXXXXX) must be labeled with their EXACT PubMed paper title.
4. If the actual paper title does not match the article topic, REMOVE that citation entirely — do not keep it with a fabricated label.
5. Known violation to catch: PMC8868033 is titled "Rising Rates of Adolescent Depression in the United States" — it must NOT be labeled as anything related to defiance, emotion regulation, or behavioral management.
`;

// ── All downstream nodes that output the final article text ───────────────────
// These are the nodes that could strip Meta Title during their processing.
const DOWNSTREAM_NODES = [
  'Post-Draft Fact Checker',
  'Document Export Sanitization',
  'Document Export Sanitization3',
  'Document Export Sanitization4',
  'Document Export Sanitization5',
  'Document Export Sanitization6',
  'Document Export Sanitization7',
  'QA Rewriter Agent',
  'QA Rewriter Agent1',
  'QA Rewriter Agent2',
  'QA Rewriter Agent3',
  'OpenAI Humanised Readability Rewrite',
  'Claude Humanised Readability Rewrite',
  'Claude Final SEO Snippet Optimization',
  'Final SEO Snippet Optimization',
  '1st Improvement LLM2',
  '1st Improvement LLM3',
  'Improvement LLM2',
  'Improvement LLM3',
];

data.nodes.forEach(node => {
  if (!DOWNSTREAM_NODES.includes(node.name)) return;

  const params = node.parameters;

  // Helper: inject into a prompt string if not already patched
  const inject = (prompt, extraBlock) => {
    if (!prompt || typeof prompt !== 'string') return prompt;
    if (prompt.includes('STRUCTURAL LOCK')) return prompt; // already patched
    return prompt + extraBlock;
  };

  // ── Handle Langchain chat message nodes ─────────────────────────────────────
  if (params?.messages?.message) {
    const msgs = params.messages.message;
    const sysMsg = msgs.find(m => m.role === 'system');
    if (sysMsg) {
      const updated = inject(sysMsg.content, META_LOCK);
      if (updated !== sysMsg.content) {
        sysMsg.content = updated;
        changes++;
        console.log(`✅ Patched system msg in: ${node.name}`);
      }
    }
  }

  // ── Handle Basic LLM / text nodes ───────────────────────────────────────────
  if (params?.messages?.values) {
    const msgs = params.messages.values;
    const sysMsg = msgs.find(m => m.role === 'system');
    if (sysMsg) {
      const updated = inject(sysMsg.content, META_LOCK);
      if (updated !== sysMsg.content) {
        sysMsg.content = updated;
        changes++;
        console.log(`✅ Patched messages.values system in: ${node.name}`);
      }
    }
  }

  // ── Handle Claude/OpenAI nodes with a top-level 'prompt' or 'text' ──────────
  ['prompt', 'text'].forEach(key => {
    if (params?.[key] && typeof params[key] === 'string' && params[key].length > 20) {
      const updated = inject(params[key], META_LOCK);
      if (updated !== params[key]) {
        params[key] = updated;
        changes++;
        console.log(`✅ Patched params.${key} in: ${node.name}`);
      }
    }
  });
});

// ── Add citation verification to Post-Draft Fact Checker system prompt ────────
const postChecker = data.nodes.find(n => n.name === 'Post-Draft Fact Checker');
if (postChecker) {
  const msgs = postChecker.parameters?.messages?.message;
  if (msgs) {
    const sysMsg = msgs.find(m => m.role === 'system');
    if (sysMsg && !sysMsg.content.includes('CITATION LABEL VERIFICATION')) {
      sysMsg.content += CITATION_VERIFY;
      changes++;
      console.log('✅ Added citation label verification to: Post-Draft Fact Checker');
    }
  }
}

// ── Also add it to Pre-Draft Fact Checker ────────────────────────────────────
const preChecker = data.nodes.find(n => n.name === 'Pre-Draft Fact Checker');
if (preChecker) {
  const msgs = preChecker.parameters?.messages?.message;
  if (msgs) {
    const sysMsg = msgs.find(m => m.role === 'system');
    if (sysMsg && !sysMsg.content.includes('CITATION LABEL VERIFICATION')) {
      sysMsg.content += CITATION_VERIFY;
      changes++;
      console.log('✅ Added citation label verification to: Pre-Draft Fact Checker');
    }
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
console.log(`\nTotal changes: ${changes}`);
console.log('✅ Saved:', FILE);
console.log('\nNext: Re-import the updated JSON into n8n, then run delete_and_resend.js');
