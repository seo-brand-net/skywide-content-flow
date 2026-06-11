/**
 * Transplants working Anthropic model nodes from TEST workflow into DEV workflow.
 * - Removes the broken "Model — X" nodes
 * - Clones real working nodes from TEST, renames them, places them at correct positions
 * - Rewires all ai_languageModel connections
 */
const fs = require('fs');

const dev = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
const test = JSON.parse(fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8'));

// Backup
fs.copyFileSync('DEV Skywide Content (Word Count Fix).json', 'DEV Skywide Content (Word Count Fix) PRE-TRANSPLANT.json');
console.log('✅ Backup saved\n');

// ── Template nodes from TEST (pick ones with correct models) ──────────────────
const opusTemplate   = test.nodes.find(n => n.name === 'Anthropic Chat Model4');   // claude-opus-4
const sonnetTemplate = test.nodes.find(n => n.name === 'Anthropic Chat Model18');  // claude-sonnet-4

console.log('Opus template:', opusTemplate.name, opusTemplate.parameters.model?.value);
console.log('Sonnet template:', sonnetTemplate.name, sonnetTemplate.parameters.model?.value);

// ── Definition of each model node we need ────────────────────────────────────
// name         = the name it should have in DEV
// template     = which template to clone
// chain        = the chain node it feeds into (ai_languageModel connection)
// position     = where to place it (below its chain node)

const MODEL_DEFS = [
    { name: 'Model — Claude Draft',            template: opusTemplate,   chain: 'Claude Draft (Claude Opus 3)1',               position: [4100, 380]  },
    { name: 'Model — Keyword Check',           template: sonnetTemplate, chain: 'Claude Keyword Check + Semantic Gap1',         position: [6800, 380]  },
    { name: 'Model — Apply Recommendations',   template: sonnetTemplate, chain: 'Claude Apply Recommendations1',               position: [7250, 380]  },
    { name: 'Model — EEAT Injection',          template: sonnetTemplate, chain: 'Claude EEAT Injection1',                      position: [7700, 380]  },
    { name: 'Model — NLP PR',                  template: sonnetTemplate, chain: 'Claude NLP & PR Optimization',                position: [8200, 380]  },
    { name: 'Model — Humanised Rewrite',       template: sonnetTemplate, chain: 'Claude Humanised Readability Rewrite',        position: [8600, 380]  },
    { name: 'Model — Final SEO',               template: sonnetTemplate, chain: 'Claude Final SEO Snippet Optimization',      position: [9100, 380]  },
    { name: 'Model — Surgical Rewriter',       template: sonnetTemplate, chain: 'Surgical Rewriter',                           position: [9100, 1060] },
];

// ── Remove all existing "Model — " nodes from DEV ────────────────────────────
dev.nodes = dev.nodes.filter(n => !n.name.startsWith('Model — '));

// ── Remove all existing ai_languageModel connections FROM "Model — " nodes ───
for (const key of Object.keys(dev.connections)) {
    if (key.startsWith('Model — ')) {
        delete dev.connections[key];
    }
}
console.log('\n✅ Removed old model nodes and their connections');

// ── Clone and insert new model nodes ─────────────────────────────────────────
let counter = 9100;
for (const def of MODEL_DEFS) {
    const cloned = JSON.parse(JSON.stringify(def.template)); // deep clone
    cloned.id       = 'transplant-' + (++counter);
    cloned.name     = def.name;
    cloned.position = def.position;
    // Keep all parameters and credentials exactly as they are in the template

    dev.nodes.push(cloned);

    // Wire ai_languageModel connection: this model → its chain node
    dev.connections[def.name] = {
        ai_languageModel: [
            [{ node: def.chain, type: 'ai_languageModel', index: 0 }]
        ]
    };

    console.log(`✅ Added "${def.name}" (${cloned.parameters.model?.value}) → "${def.chain}"`);
}

// ── Save ─────────────────────────────────────────────────────────────────────
fs.writeFileSync('DEV Skywide Content (Word Count Fix).json', JSON.stringify(dev, null, 2));
console.log('\n✅ Saved DEV workflow\n');

// ── Verify ───────────────────────────────────────────────────────────────────
const verify = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// Check all 8 model nodes exist
console.log('=== VERIFICATION ===');
for (const def of MODEL_DEFS) {
    const node = verify.nodes.find(n => n.name === def.name);
    const conn = verify.connections[def.name]?.ai_languageModel?.[0]?.[0]?.node;
    const credId = node?.credentials?.anthropicApi?.id;
    const modelVal = node?.parameters?.model?.value;
    const hasRl = node?.parameters?.model?.__rl === true;
    const ok = node && conn === def.chain && credId === 'IaiIXT5KuipoyTHR' && hasRl;
    console.log(
        (ok ? '✅' : '❌'),
        def.name.padEnd(38),
        '| model:', modelVal,
        '| cred:', credId,
        '| wired to:', conn
    );
}

// Check no remaining broken nodes
const broken = verify.nodes.filter(n => n.name.startsWith('Model — ') && !n.parameters?.model?.__rl);
console.log('\nBroken model nodes remaining:', broken.length === 0 ? '0 ✅' : broken.map(n => n.name));
