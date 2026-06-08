/**
 * FIX: Missing language models + fixed-mode expression fields
 *
 * PART 1 — Add missing lmChatAnthropic sub-nodes for all 8 chainLlm nodes
 * that have no model connected. Each gets its own model node (n8n requires
 * one model node per chain node — they cannot share).
 *
 * Model assignments:
 *   Claude Draft (Claude Opus 3)1         → claude-opus-4-5  (flagship, highest quality)
 *   Claude Keyword Check + Semantic Gap1  → claude-sonnet-4-5 (fast, capable)
 *   Claude Apply Recommendations1         → claude-sonnet-4-5
 *   Claude EEAT Injection1                → claude-sonnet-4-5
 *   Claude NLP & PR Optimization          → claude-sonnet-4-5
 *   Claude Humanised Readability Rewrite  → claude-sonnet-4-5
 *   Claude Final SEO Snippet Optimization → claude-sonnet-4-5
 *   Surgical Rewriter                     → claude-haiku-4-5  (lightweight fix node)
 *
 * PART 2 — Switch all 23 fixed-mode fields to expression mode
 * In n8n JSON, expression mode = value string starts with "="
 * Fixed mode = plain string without "=" prefix
 */

const fs = require('fs');
const { v4: uuidv4 } = require('crypto'); // we'll use a simple ID generator

const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
fs.copyFileSync(
    'DEV Skywide Content (Word Count Fix).json',
    `DEV Skywide Content (Word Count Fix) PRE-MODELFIX-${ts}.json`
);
console.log('✅ Backup created\n');

const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// Simple UUID-style ID generator (no external dependency)
let idCounter = 9000;
function makeId() { return 'model-fix-' + (++idCounter); }

// ─────────────────────────────────────────────────────────────────────────────
// PART 1 — ADD MISSING LANGUAGE MODEL NODES
// ─────────────────────────────────────────────────────────────────────────────

// Find existing model node to copy credential config from
const existingModel = wf.nodes.find(n => n.type.includes('lmChatAnthropic'));
const existingOpenAI = wf.nodes.find(n => n.type.includes('lmChatOpenAi'));

// Get the Anthropic credential from existing node (if any)
// If no Anthropic model exists yet, we create fresh nodes with credential placeholder
const anthropicCred = existingModel
    ? existingModel.credentials
    : { anthropicApi: { id: '', name: 'Anthropic account' } };

// Model assignments per chain node
// Position offsets: model node sits below its parent at y + 380
const MODEL_ASSIGNMENTS = [
    {
        chainName: 'Claude Draft (Claude Opus 3)1',
        modelName: 'Model — Claude Draft',
        model: 'claude-opus-4-5',
        maxTokens: 16000,
    },
    {
        chainName: 'Claude Keyword Check + Semantic Gap1',
        modelName: 'Model — Keyword Check',
        model: 'claude-sonnet-4-5',
        maxTokens: 8000,
    },
    {
        chainName: 'Claude Apply Recommendations1',
        modelName: 'Model — Apply Recommendations',
        model: 'claude-sonnet-4-5',
        maxTokens: 8000,
    },
    {
        chainName: 'Claude EEAT Injection1',
        modelName: 'Model — EEAT Injection',
        model: 'claude-sonnet-4-5',
        maxTokens: 8000,
    },
    {
        chainName: 'Claude NLP & PR Optimization',
        modelName: 'Model — NLP PR',
        model: 'claude-sonnet-4-5',
        maxTokens: 8000,
    },
    {
        chainName: 'Claude Humanised Readability Rewrite',
        modelName: 'Model — Humanised Rewrite',
        model: 'claude-sonnet-4-5',
        maxTokens: 8000,
    },
    {
        chainName: 'Claude Final SEO Snippet Optimization',
        modelName: 'Model — Final SEO',
        model: 'claude-sonnet-4-5',
        maxTokens: 8000,
    },
    {
        chainName: 'Surgical Rewriter',
        modelName: 'Model — Surgical Rewriter',
        model: 'claude-haiku-4-5',
        maxTokens: 4000,
    },
];

let modelsAdded = 0;

for (const assign of MODEL_ASSIGNMENTS) {
    const chainNode = wf.nodes.find(n => n.name === assign.chainName);
    if (!chainNode) {
        console.log('⚠️  Chain node not found:', assign.chainName);
        continue;
    }

    // Check if a model is already connected to this chain
    const alreadyConnected = Object.entries(wf.connections || {}).some(([src, outMap]) => {
        if (!outMap.ai_languageModel) return false;
        return outMap.ai_languageModel.some(targets =>
            targets && targets.some(t => t.node === assign.chainName)
        );
    });

    if (alreadyConnected) {
        console.log('✅ Already has model:', assign.chainName);
        continue;
    }

    // Position model node below its chain node
    const [cx, cy] = chainNode.position || [0, 0];
    const modelPosition = [cx, cy + 380];

    // Create the model node
    const modelNode = {
        id: makeId(),
        name: assign.modelName,
        type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
        typeVersion: 1.3,
        position: modelPosition,
        credentials: anthropicCred,
        parameters: {
            model: assign.model,
            options: {
                maxTokens: assign.maxTokens,
                temperature: 0.7,
            },
        },
    };

    wf.nodes.push(modelNode);

    // Wire: modelNode.ai_languageModel → chainNode
    if (!wf.connections[assign.modelName]) {
        wf.connections[assign.modelName] = {};
    }
    wf.connections[assign.modelName].ai_languageModel = [
        [{ node: assign.chainName, type: 'ai_languageModel', index: 0 }]
    ];

    modelsAdded++;
    console.log(`✅ Added model [${assign.model}] for: ${assign.chainName}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 2 — FIX FIXED-MODE EXPRESSION FIELDS (add "=" prefix)
// ─────────────────────────────────────────────────────────────────────────────
// In n8n workflow JSON, a field in expression mode starts with "="
// A field in fixed mode is a plain string.
// Switching fixed → expression = prepend "=" if the string contains {{ or $('

let fixedFixed = 0;

function fixExpressionField(obj, key) {
    const val = obj[key];
    if (typeof val !== 'string') return;
    const hasExpr = val.includes('{{') || val.includes("$('");
    const isExpr = val.startsWith('=');
    if (hasExpr && !isExpr) {
        obj[key] = '=' + val;
        fixedFixed++;
        return true;
    }
    return false;
}

for (const node of wf.nodes) {
    const p = node.parameters || {};

    // chainLlm messageValues
    if (p.messages && p.messages.messageValues) {
        for (const mv of p.messages.messageValues) {
            if (mv.message !== undefined) fixExpressionField(mv, 'message');
        }
    }

    // Perplexity / OpenAI message array
    if (p.messages && p.messages.message) {
        for (const m of p.messages.message) {
            if (m.content !== undefined) fixExpressionField(m, 'content');
        }
    }

    // OpenAI values array
    if (p.messages && p.messages.values) {
        for (const v of p.messages.values) {
            if (v.content !== undefined) fixExpressionField(v, 'content');
        }
    }

    // chainLlm top-level text field
    if (p.text !== undefined) fixExpressionField(p, 'text');

    // Also fix promptType — if there are expressions in text, promptType should be 'define'
    // (not 'input' which reads from previous node output)
    if (p.text && p.text.startsWith('=') && p.promptType === 'input') {
        // Keep as-is — 'input' means read from previous node's output
        // Only change if it's causing issues
    }
}

console.log(`\n✅ Fixed ${fixedFixed} fixed-mode expression fields → expression mode`);

// ─────────────────────────────────────────────────────────────────────────────
// SPECIAL: Data Check user message role was undefined — fix it
// ─────────────────────────────────────────────────────────────────────────────
const dataCheck = wf.nodes.find(n => n.name === 'Data Check & Research Gaps1');
if (dataCheck && dataCheck.parameters.messages && dataCheck.parameters.messages.message) {
    const msgs = dataCheck.parameters.messages.message;
    for (const m of msgs) {
        if (!m.role) {
            m.role = 'user';
            console.log('✅ Fixed undefined role in Data Check user message');
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIAL: Post-Draft Fact Checker user message role — same fix
// ─────────────────────────────────────────────────────────────────────────────
const postFC = wf.nodes.find(n => n.name === 'Post-Draft Fact Checker');
if (postFC && postFC.parameters.messages && postFC.parameters.messages.message) {
    for (const m of postFC.parameters.messages.message) {
        if (!m.role) { m.role = 'user'; console.log('✅ Fixed undefined role in Post-Draft FC user message'); }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIAL: Claude Apply Recommendations — OpenAI values undefined role fix
// ─────────────────────────────────────────────────────────────────────────────
const applyRec = wf.nodes.find(n => n.name === 'Claude Apply Recommendations1');
if (applyRec && applyRec.parameters.messages && applyRec.parameters.messages.values) {
    for (const v of applyRec.parameters.messages.values) {
        if (!v.role) { v.role = 'user'; console.log('✅ Fixed undefined role in Apply Recommendations'); }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync('DEV Skywide Content (Word Count Fix).json', JSON.stringify(wf, null, 2));

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY
// ─────────────────────────────────────────────────────────────────────────────
const verify = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// Re-run model connection check
const modelFeedsInto = {};
for (const [src, outMap] of Object.entries(verify.connections || {})) {
    if (outMap.ai_languageModel) {
        for (const targets of outMap.ai_languageModel) {
            if (!targets) continue;
            for (const t of targets) { modelFeedsInto[src] = t.node; }
        }
    }
}
const chainsWithModel = new Set(Object.values(modelFeedsInto));
const chainNodes = verify.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.chainLlm');
const stillMissing = chainNodes.filter(n => !chainsWithModel.has(n.name));

// Re-run fixed-mode check
let remainingFixed = 0;
for (const node of verify.nodes) {
    const p = node.parameters || {};
    const fields = [];
    if (p.messages?.messageValues) fields.push(...p.messages.messageValues.map(m => m.message));
    if (p.messages?.message) fields.push(...p.messages.message.map(m => m.content));
    if (p.messages?.values) fields.push(...p.messages.values.map(v => v.content));
    if (p.text) fields.push(p.text);
    for (const f of fields) {
        if (typeof f === 'string' && (f.includes('{{') || f.includes("$('")) && !f.startsWith('=')) {
            remainingFixed++;
        }
    }
}

console.log('\n' + '═'.repeat(55));
console.log('VERIFICATION');
console.log('═'.repeat(55));
console.log('chainLlm nodes still missing model:', stillMissing.length === 0 ? '0 ✅' : stillMissing.map(n => n.name));
console.log('Remaining fixed-mode expression fields:', remainingFixed === 0 ? '0 ✅' : remainingFixed);
console.log('Total nodes:', verify.nodes.length, '(was 47 pipeline + 13 stickies = 60, now + ' + modelsAdded + ' models = ' + verify.nodes.length + ')');
console.log('Models added:', modelsAdded);
console.log('Fixed-mode fields corrected:', fixedFixed);
