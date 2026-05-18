/**
 * migrate_to_dev.js
 *
 * Migrates all TEST workflow improvements to DEV Skywide Content (Word Count Fix).json:
 *
 * A. Transplant new nodes (don't exist in DEV):
 *    - Pre-Draft Fact Checker  (Parse Creative Brief → [Pre-Draft] → Keyword Strategist)
 *    - Post-Draft Fact Checker (Data Check & Research Gaps1 → [Post-Draft] → Keyword Checks)
 *
 * B. Migrate parameter changes to 19 shared nodes:
 *    - Keyword Strategist: updated code with system_prompt_injection + all guardrails
 *    - All downstream processing nodes: Meta Title structural lock
 *    - Pre/Post Fact Checkers: citation label verification (applied during transplant above)
 */

const fs = require('fs');
const TEST_FILE = 'TEST Skywide Content (Prompt Review).json';
const DEV_FILE  = 'DEV Skywide Content (Word Count Fix).json';

const test = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
const dev  = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'));

let changes = 0;

// ─── Helper: find node by name ────────────────────────────────────────────────
const findNode = (workflow, name) => workflow.nodes.find(n => n.name === name);

// ── A. TRANSPLANT FACT-CHECKER NODES ─────────────────────────────────────────
// 
// 1. Remove the old direct connections we're inserting between
// 2. Add the new nodes to dev.nodes
// 3. Add the new connections

// A1. Pre-Draft Fact Checker
// TEST connection: Parse Creative Brief (LLM) → Pre-Draft → Keyword Strategist
// In DEV currently:  Parse Creative Brief (LLM) → Keyword Strategist (direct)
// After:             Parse Creative Brief (LLM) → Pre-Draft → Keyword Strategist

if (!findNode(dev, 'Pre-Draft Fact Checker')) {
  const preNode = JSON.parse(JSON.stringify(findNode(test, 'Pre-Draft Fact Checker')));
  
  // Position it between Parse Creative Brief (LLM) and Keyword Strategist in DEV
  const parseNode = findNode(dev, 'Parse Creative Brief (LLM)');
  const ksNode    = findNode(dev, 'Keyword Strategist');
  if (parseNode && ksNode) {
    // Place roughly midpoint between the two anchor nodes
    preNode.position = [
      Math.round((parseNode.position[0] + ksNode.position[0]) / 2),
      Math.round((parseNode.position[1] + ksNode.position[1]) / 2) - 150,
    ];
  }
  
  dev.nodes.push(preNode);
  changes++;
  console.log('✅ Added node: Pre-Draft Fact Checker');

  // Rewire: break Parse Creative Brief → Keyword Strategist, insert Pre-Draft between them
  // Remove direct connection from Parse Creative Brief to Keyword Strategist
  const parseCon = dev.connections['Parse Creative Brief (LLM)'];
  if (parseCon?.main) {
    parseCon.main = parseCon.main.map(targets =>
      (targets || []).filter(t => t.node !== 'Keyword Strategist')
    );
    changes++;
    console.log('✅ Removed direct connection: Parse Creative Brief → Keyword Strategist');
  }

  // Add Parse Creative Brief → Pre-Draft Fact Checker
  if (!dev.connections['Parse Creative Brief (LLM)']) dev.connections['Parse Creative Brief (LLM)'] = { main: [] };
  while (dev.connections['Parse Creative Brief (LLM)'].main.length < 1) dev.connections['Parse Creative Brief (LLM)'].main.push([]);
  dev.connections['Parse Creative Brief (LLM)'].main[0].push({ node: 'Pre-Draft Fact Checker', type: 'main', index: 0 });
  changes++;
  console.log('✅ Added connection: Parse Creative Brief → Pre-Draft Fact Checker');

  // Add Pre-Draft Fact Checker → Keyword Strategist
  dev.connections['Pre-Draft Fact Checker'] = { main: [[{ node: 'Keyword Strategist', type: 'main', index: 0 }]] };
  changes++;
  console.log('✅ Added connection: Pre-Draft Fact Checker → Keyword Strategist');
} else {
  console.log('ℹ️  Pre-Draft Fact Checker already in DEV');
}

// A2. Post-Draft Fact Checker
// TEST connection: Data Check & Research Gaps1 → Post-Draft → OpenAI/Claude Keyword Checks
// In DEV currently:  Data Check & Research Gaps1 → OpenAI Keyword Check + Claude Keyword Check (direct)
// After:             Data Check & Research Gaps1 → Post-Draft → OpenAI/Claude Keyword Checks

if (!findNode(dev, 'Post-Draft Fact Checker')) {
  const postNode = JSON.parse(JSON.stringify(findNode(test, 'Post-Draft Fact Checker')));
  
  // Position between Data Check and Keyword Check nodes
  const dataCheck = findNode(dev, 'Data Check & Research Gaps1');
  const kwCheck   = findNode(dev, 'OpenAI Keyword Check + Semantic Gap1');
  if (dataCheck && kwCheck) {
    postNode.position = [
      Math.round((dataCheck.position[0] + kwCheck.position[0]) / 2),
      Math.round((dataCheck.position[1] + kwCheck.position[1]) / 2) - 150,
    ];
  }

  dev.nodes.push(postNode);
  changes++;
  console.log('✅ Added node: Post-Draft Fact Checker');

  // Remove direct connections from Data Check to keyword check nodes
  const dataCon = dev.connections['Data Check & Research Gaps1'];
  if (dataCon?.main) {
    dataCon.main = dataCon.main.map(targets =>
      (targets || []).filter(t =>
        t.node !== 'OpenAI Keyword Check + Semantic Gap1' &&
        t.node !== 'Claude Keyword Check + Semantic Gap1'
      )
    );
    changes++;
    console.log('✅ Removed direct connections: Data Check → Keyword Checks');
  }

  // Add Data Check → Post-Draft Fact Checker
  if (!dev.connections['Data Check & Research Gaps1']) dev.connections['Data Check & Research Gaps1'] = { main: [] };
  while (dev.connections['Data Check & Research Gaps1'].main.length < 1) dev.connections['Data Check & Research Gaps1'].main.push([]);
  dev.connections['Data Check & Research Gaps1'].main[0].push({ node: 'Post-Draft Fact Checker', type: 'main', index: 0 });
  changes++;
  console.log('✅ Added connection: Data Check → Post-Draft Fact Checker');

  // Add Post-Draft Fact Checker → OpenAI Keyword Check + Semantic Gap1
  // Add Post-Draft Fact Checker → Claude Keyword Check + Semantic Gap1
  dev.connections['Post-Draft Fact Checker'] = {
    main: [[
      { node: 'OpenAI Keyword Check + Semantic Gap1', type: 'main', index: 0 },
      { node: 'Claude Keyword Check + Semantic Gap1', type: 'main', index: 0 },
    ]]
  };
  changes++;
  console.log('✅ Added connections: Post-Draft Fact Checker → Keyword Checks');
} else {
  console.log('ℹ️  Post-Draft Fact Checker already in DEV');
}

// ── B. MIGRATE PARAMETER CHANGES TO SHARED NODES ─────────────────────────────

const SHARED_NODES = [
  'Keyword Strategist',
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

// For Keyword Strategist — copy full jsCode (adds system_prompt_injection + guardrails)
const ksTest = findNode(test, 'Keyword Strategist');
const ksDev  = findNode(dev, 'Keyword Strategist');
if (ksTest && ksDev) {
  const testCode = ksTest.parameters.jsCode || ksTest.parameters.code;
  const devCodeKey = ksDev.parameters.jsCode !== undefined ? 'jsCode' : 'code';
  if (testCode && !ksDev.parameters[devCodeKey]?.includes('system_prompt_injection')) {
    ksDev.parameters[devCodeKey] = testCode;
    changes++;
    console.log('✅ Migrated: Keyword Strategist code (adds system_prompt_injection, guardrails)');
  } else {
    console.log('ℹ️  Keyword Strategist already up to date');
  }
}

// For all other shared nodes — copy the specific changed prompts from TEST to DEV
// Strategy: if TEST node has STRUCTURAL LOCK, copy the full prompt/message content
const META_LOCK_MARKER  = 'STRUCTURAL LOCK';
const CITATION_MARKER   = 'CITATION LABEL VERIFICATION';

SHARED_NODES.filter(n => n !== 'Keyword Strategist').forEach(name => {
  const testNode = findNode(test, name);
  const devNode  = findNode(dev, name);
  if (!testNode || !devNode) return;

  // Copy messages.values system prompt
  if (testNode.parameters?.messages?.values && devNode.parameters?.messages?.values) {
    const testSys = testNode.parameters.messages.values.find(m => m.role === 'system');
    const devSys  = devNode.parameters.messages.values.find(m => m.role === 'system');
    if (testSys && devSys && testSys.content.includes(META_LOCK_MARKER) && !devSys.content.includes(META_LOCK_MARKER)) {
      devSys.content = testSys.content;
      changes++;
      console.log('✅ Migrated messages.values system prompt:', name);
    }
  }

  // Copy messages.message system prompt (Langchain chat nodes)
  if (testNode.parameters?.messages?.message && devNode.parameters?.messages?.message) {
    const testSys = testNode.parameters.messages.message.find(m => m.role === 'system');
    const devSys  = devNode.parameters.messages.message.find(m => m.role === 'system');
    if (testSys && devSys && testSys.content.includes(META_LOCK_MARKER) && !devSys.content.includes(META_LOCK_MARKER)) {
      devSys.content = testSys.content;
      changes++;
      console.log('✅ Migrated messages.message system prompt:', name);
    }
    // Also copy user message if it changed (e.g., Post-Draft fact_check_report ref)
    const testUser = testNode.parameters.messages.message.find(m => m.role !== 'system');
    const devUser  = devNode.parameters.messages.message.find(m => m.role !== 'system');
    if (testUser && devUser && testUser.content !== devUser.content) {
      devUser.content = testUser.content;
      changes++;
      console.log('✅ Migrated user message:', name);
    }
  }

  // Copy top-level text/prompt fields
  ['text', 'prompt'].forEach(key => {
    if (testNode.parameters?.[key] && devNode.parameters?.[key] !== undefined) {
      if (testNode.parameters[key].includes(META_LOCK_MARKER) && !devNode.parameters[key]?.includes(META_LOCK_MARKER)) {
        devNode.parameters[key] = testNode.parameters[key];
        changes++;
        console.log(`✅ Migrated params.${key}:`, name);
      }
    }
  });
});

// ── Save DEV ──────────────────────────────────────────────────────────────────
fs.writeFileSync(DEV_FILE, JSON.stringify(dev, null, 2), 'utf8');
console.log(`\n=== Migration Complete ===`);
console.log(`Total changes: ${changes}`);
console.log(`✅ Saved: ${DEV_FILE}`);
console.log(`\nNext: Re-import DEV Skywide Content (Word Count Fix).json into n8n`);
