/**
 * patch_models_opus.js
 *
 * Replaces all broken/deprecated claude-opus-4-20250514 snapshot references
 * with claude-opus-4-5 (the latest stable Claude Opus 4.5 snapshot).
 *
 * Claude Opus 4.5 = most capable model, correct choice for the Draft node
 * which handles 10+ simultaneous constraints.
 *
 * Run: node patch_models_opus.js
 */

const fs = require('fs');

const WORKFLOW_FILE = 'DEV Skywide Content.json';
const BACKUP_FILE   = 'DEV Skywide Content.BACKUP_pre_opus45.json';

const DEPRECATED_MODEL = 'claude-opus-4-20250514';
const STABLE_OPUS      = 'claude-opus-4-5';    // Claude Opus 4.5 — latest stable
const STABLE_SONNET    = 'claude-sonnet-4-5';  // For lighter post-processing nodes

// Which node names should get Opus (heavy) vs Sonnet (lighter post-processing)
const SONNET_NODES = [
    'Anthropic Chat Model13',   // Currently on claude-sonnet-4-20250514 — keep as Sonnet
];

const raw = fs.readFileSync(WORKFLOW_FILE, 'utf8');
const dev = JSON.parse(raw);

fs.writeFileSync(BACKUP_FILE, raw);
console.log('Backup saved: ' + BACKUP_FILE + '\n');

let patchCount = 0;

dev.nodes.forEach(n => {
    if (n.type !== '@n8n/n8n-nodes-langchain.lmChatAnthropic') return;

    const mv = n.parameters && n.parameters.model;
    const currentModel = mv && mv.value ? mv.value : '';

    // Only patch the deprecated snapshot
    if (
        currentModel === DEPRECATED_MODEL ||
        currentModel === 'claude-3-opus-20240229' ||
        currentModel === undefined ||
        currentModel === ''
    ) {
        // Determine correct replacement
        const targetModel = SONNET_NODES.includes(n.name) ? STABLE_SONNET : STABLE_OPUS;

        n.parameters.model = {
            __rl: true,
            value: targetModel,
            mode: 'list',
            cachedResultName: targetModel
        };

        console.log('[PATCHED] ' + n.name);
        console.log('         ' + currentModel + ' --> ' + targetModel);
        patchCount++;
    } else {
        console.log('[OK]      ' + n.name + ' --> ' + currentModel);
    }
});

// Also fix claude-sonnet-4-20250514 snapshot -> claude-sonnet-4-5
dev.nodes.forEach(n => {
    if (n.type !== '@n8n/n8n-nodes-langchain.lmChatAnthropic') return;
    const mv = n.parameters && n.parameters.model;
    const currentModel = mv && mv.value ? mv.value : '';
    if (currentModel === 'claude-sonnet-4-20250514') {
        n.parameters.model.value = STABLE_SONNET;
        n.parameters.model.cachedResultName = STABLE_SONNET;
        console.log('[PATCHED] ' + n.name + ': claude-sonnet-4-20250514 --> ' + STABLE_SONNET);
        patchCount++;
    }
});

fs.writeFileSync(WORKFLOW_FILE, JSON.stringify(dev, null, 2));

console.log('\n--- FINAL MODEL MAP ---');
dev.nodes.forEach(n => {
    if (
        n.type === '@n8n/n8n-nodes-langchain.lmChatAnthropic' ||
        n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi'
    ) {
        const mv = n.parameters && n.parameters.model;
        const ms = mv && mv.value ? mv.value : 'UNDEFINED';
        console.log('  ' + n.name + ' --> ' + ms);
    }
});

console.log('\n✅ Patched ' + patchCount + ' node(s).');
console.log('Re-import DEV Skywide Content.json into n8n to activate.');
