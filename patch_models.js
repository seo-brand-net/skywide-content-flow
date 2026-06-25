/**
 * patch_models.js
 * 
 * Patches the DEV Skywide Content.json workflow to replace deprecated/broken
 * model references with stable current equivalents.
 * 
 * CHANGES:
 *  - Anthropic Chat Model4 (powers Claude Draft node) --> claude-sonnet-4-5 (claude-sonnet-4-20250514)
 *  - Claims Extractor Model (OpenAI, undefined model) --> gpt-4o
 *  - All remaining claude-opus-4-20250514 sub-nodes left as-is (currently stable)
 * 
 * Run: node patch_models.js
 */

const fs = require('fs');

const WORKFLOW_FILE = 'DEV Skywide Content.json';
const BACKUP_FILE   = 'DEV Skywide Content.BACKUP.json';

// Read workflow
const raw = fs.readFileSync(WORKFLOW_FILE, 'utf8');
const dev = JSON.parse(raw);

// Backup first
fs.writeFileSync(BACKUP_FILE, raw);
console.log('Backup saved to: ' + BACKUP_FILE);

let patchCount = 0;

dev.nodes.forEach(n => {
    // ── FIX 1: Anthropic Chat Model4 (powers the Claude Draft node)
    // This was the broken node — model was undefined / removed
    if (n.name === 'Anthropic Chat Model4' && n.type === '@n8n/n8n-nodes-langchain.lmChatAnthropic') {
        const before = n.parameters && n.parameters.model && n.parameters.model.value;
        n.parameters = n.parameters || {};
        n.parameters.model = {
            __rl: true,
            value: 'claude-sonnet-4-5',
            mode: 'list',
            cachedResultName: 'claude-sonnet-4-5'
        };
        console.log('[PATCHED] ' + n.name + ': ' + before + ' --> claude-sonnet-4-5');
        patchCount++;
    }

    // ── FIX 2: Claims Extractor Model (OpenAI node with undefined model)
    if (n.name === 'Claims Extractor Model' && n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
        const before = n.parameters && n.parameters.model && n.parameters.model.value;
        n.parameters = n.parameters || {};
        n.parameters.model = {
            __rl: true,
            value: 'gpt-4o',
            mode: 'list',
            cachedResultName: 'gpt-4o'
        };
        console.log('[PATCHED] ' + n.name + ': ' + before + ' --> gpt-4o');
        patchCount++;
    }

    // ── FIX 3: Replace any remaining claude-3-opus-20240229 (deprecated) with claude-sonnet-4-5
    if (n.type === '@n8n/n8n-nodes-langchain.lmChatAnthropic') {
        const modelVal = n.parameters && n.parameters.model && n.parameters.model.value;
        if (modelVal === 'claude-3-opus-20240229') {
            n.parameters.model.value = 'claude-sonnet-4-5';
            n.parameters.model.cachedResultName = 'claude-sonnet-4-5';
            console.log('[PATCHED] ' + n.name + ': claude-3-opus-20240229 --> claude-sonnet-4-5');
            patchCount++;
        }
    }
});

// Save patched workflow
fs.writeFileSync(WORKFLOW_FILE, JSON.stringify(dev, null, 2));

console.log('\n✅ Done. ' + patchCount + ' node(s) patched.');
console.log('Saved to: ' + WORKFLOW_FILE);
console.log('\nNow re-import DEV Skywide Content.json into n8n to activate the fix.');
