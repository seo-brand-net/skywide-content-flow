/**
 * AUDIT: chainLlm nodes missing models + fixed-mode prompt fields
 *
 * In n8n:
 * - chainLlm nodes need a "languageModel" connection (ai_languageModel type)
 *   delivered via a sub-node (lmChatOpenAi, lmChatAnthropic, lmChatMistralCloud, etc.)
 * - This connection is in wf.connections[modelNodeName].ai_languageModel
 * - If no model feeds a chainLlm node → "Chat Model" error on execution
 *
 * Fixed vs Expression:
 * - In n8n JSON, a text field that uses expressions MUST have its value
 *   prefixed with "=" OR stored under the right key type
 * - For chainLlm messageValues: message field should start with "=" if it
 *   contains {{ }} expressions
 * - For perplexity message.content: same rule
 * - For openAI messages.values[].content: same rule
 * - If stored as plain text (no "=" prefix), n8n treats {{ }} as literal text
 */

const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// ─────────────────────────────────────────────────────────────────────────────
// 1. MAP ALL ai_languageModel CONNECTIONS
//    connections structure: { [sourceNode]: { ai_languageModel: [[{node, type, index}]] } }
// ─────────────────────────────────────────────────────────────────────────────
const modelFeedsInto = {}; // modelNodeName -> chainLlmNodeName

for (const [srcName, outMap] of Object.entries(wf.connections || {})) {
    if (outMap.ai_languageModel) {
        for (const targets of outMap.ai_languageModel) {
            if (!targets) continue;
            for (const t of targets) {
                modelFeedsInto[srcName] = t.node;
            }
        }
    }
}

console.log('=== ai_languageModel CONNECTIONS ===');
Object.entries(modelFeedsInto).forEach(([model, chain]) => {
    console.log('  ' + model.padEnd(40) + ' → ' + chain);
});

// Build reverse: which chainLlm nodes HAVE a model
const chainsWithModel = new Set(Object.values(modelFeedsInto));

// ─────────────────────────────────────────────────────────────────────────────
// 2. FIND ALL chainLlm NODES MISSING A MODEL
// ─────────────────────────────────────────────────────────────────────────────
const chainNodes = wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.chainLlm');
const chainsMissingModel = chainNodes.filter(n => !chainsWithModel.has(n.name));

console.log('\n=== chainLlm NODES MISSING A LANGUAGE MODEL ===');
if (chainsMissingModel.length === 0) {
    console.log('  All chainLlm nodes have a model connected ✅');
} else {
    chainsMissingModel.forEach(n => console.log('  ❌ MISSING MODEL: ' + n.name));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FIND ALL NODES WITH FIXED-MODE PROMPTS CONTAINING {{ }} EXPRESSIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== FIXED-MODE FIELDS CONTAINING {{ }} EXPRESSIONS ===');
console.log('(These will render as literal text — must be switched to expression mode)\n');

const issues = [];

for (const node of wf.nodes) {
    const p = node.parameters || {};

    // Check messageValues (chainLlm nodes)
    if (p.messages && p.messages.messageValues) {
        for (let i = 0; i < p.messages.messageValues.length; i++) {
            const mv = p.messages.messageValues[i];
            if (mv.message && typeof mv.message === 'string') {
                const hasExpr = mv.message.includes('{{') || mv.message.includes("$('");
                const isExpr = mv.message.startsWith('=');
                if (hasExpr && !isExpr) {
                    issues.push({ node: node.name, field: `messages.messageValues[${i}].message`, mode: 'FIXED', preview: mv.message.substring(0, 80) });
                }
            }
        }
    }

    // Check messages.message array (Perplexity, OpenAI with message array)
    if (p.messages && p.messages.message) {
        for (let i = 0; i < p.messages.message.length; i++) {
            const m = p.messages.message[i];
            if (m.content && typeof m.content === 'string') {
                const hasExpr = m.content.includes('{{') || m.content.includes("$('");
                const isExpr = m.content.startsWith('=');
                if (hasExpr && !isExpr) {
                    issues.push({ node: node.name, field: `messages.message[${i}].content (role:${m.role})`, mode: 'FIXED', preview: m.content.substring(0, 80) });
                }
            }
        }
    }

    // Check messages.values array (OpenAI standard)
    if (p.messages && p.messages.values) {
        for (let i = 0; i < p.messages.values.length; i++) {
            const v = p.messages.values[i];
            if (v.content && typeof v.content === 'string') {
                const hasExpr = v.content.includes('{{') || v.content.includes("$('");
                const isExpr = v.content.startsWith('=');
                if (hasExpr && !isExpr) {
                    issues.push({ node: node.name, field: `messages.values[${i}].content (role:${v.role})`, mode: 'FIXED', preview: v.content.substring(0, 80) });
                }
            }
        }
    }

    // Check top-level text field (chainLlm with promptType=define)
    if (p.text && typeof p.text === 'string') {
        const hasExpr = p.text.includes('{{') || p.text.includes("$('");
        const isExpr = p.text.startsWith('=');
        if (hasExpr && !isExpr) {
            issues.push({ node: node.name, field: 'text', mode: 'FIXED', preview: p.text.substring(0, 80) });
        }
    }
}

if (issues.length === 0) {
    console.log('  No fixed-mode expression fields found ✅');
} else {
    issues.forEach(i => {
        console.log(`  ❌ ${i.node}`);
        console.log(`     field: ${i.field}`);
        console.log(`     preview: ${i.preview}`);
        console.log('');
    });
    console.log(`Total fixed-mode issues: ${issues.length}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ALSO CHECK: model node types present in the workflow
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== ALL MODEL NODES IN WORKFLOW ===');
const modelTypes = ['lmChatOpenAi', 'lmChatAnthropic', 'lmChatMistralCloud', 'lmChatOllama', 'lmChatGroq', 'lmChatAzureOpenAi'];
const modelNodes = wf.nodes.filter(n => modelTypes.some(t => n.type.includes(t)));
modelNodes.forEach(n => {
    const feedsInto = modelFeedsInto[n.name] || '⚠️ NOT CONNECTED TO ANYTHING';
    console.log(`  ${n.name.padEnd(40)} [${n.type.split('.').pop()}] → ${feedsInto}`);
});

// Output summary for fix script
console.log('\n=== SUMMARY FOR FIX SCRIPT ===');
console.log('chainLlm nodes missing model:', chainsMissingModel.map(n => n.name));
console.log('Fixed-mode issues count:', issues.length);
