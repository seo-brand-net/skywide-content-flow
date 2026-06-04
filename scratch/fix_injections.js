const fs = require('fs');
const file = 'DEV Skywide Content (Word Count Fix).json';
let wf = JSON.parse(fs.readFileSync(file, 'utf8'));
let fixes = [];

// ============================================================
// FIX 3 (retry): Data Check & Research Gaps1
// Inject Post-Draft Fact Checker + H1 lock + word count lock into user message
// ============================================================
const dcNode = wf.nodes.find(n => n.name === 'Data Check & Research Gaps1');
if (dcNode && dcNode.parameters?.messages?.message) {
    const userMsg = dcNode.parameters.messages.message[1]; // index 1 is user message
    if (userMsg && typeof userMsg.content === 'string') {
        const content = userMsg.content;

        // Check if already patched
        if (content.includes('Post-Draft Fact Checker')) {
            fixes.push('FIX 3 ℹ️  Data Check already has Post-Draft Fact Checker ref — skipping');
        } else {
            // Find "# Draft:" marker which we set earlier
            const draftMarker = '# Draft:';
            const idx = content.indexOf(draftMarker);

            const injection = [
                '',
                '⚠️ H1 PRESERVATION RULE: Do NOT rewrite, rename, or change the article H1/title in any way. Output it exactly as it appears in the draft.',
                '⚠️ WORD COUNT LOCK: Target is {{ $(\'Webhook1\').first().json.body.word_count }} words (±10%). The draft is near this length. If you add anything, cut equal length elsewhere. Do NOT let the article grow beyond {{ $(\'Webhook1\').first().json.body.word_count * 1.1 }} words.',
                '',
                '# Verified Fact-Check Report (apply corrections — remove any claims flagged as unverified):',
                '{{ $(\'Post-Draft Fact Checker\').first().json.choices[0].message.content }}',
                '',
            ].join('\n');

            if (idx !== -1) {
                userMsg.content = content.slice(0, idx) + injection + content.slice(idx);
                fixes.push('FIX 3 ✅ Data Check & Research Gaps1: Injected H1 lock + word count lock + Post-Draft Fact Checker before draft section');
            } else {
                // append before the final paragraph marker or at start of content section
                const outMarker = '# Output Format';
                const outIdx = content.indexOf(outMarker);
                if (outIdx !== -1) {
                    userMsg.content = content.slice(0, outIdx) + injection + content.slice(outIdx);
                    fixes.push('FIX 3 ✅ Data Check & Research Gaps1: Injected before output format section');
                } else {
                    userMsg.content = injection + content;
                    fixes.push('FIX 3 ✅ Data Check & Research Gaps1: Prepended to user message (marker not found)');
                }
            }
        }
    }
}

// ============================================================
// FIX 4 (retry): Claude Draft (Claude Opus 3)1 — inject Client Site Researcher
// The node uses messageValues and the message is the full prompt in messageValues[1]
// ============================================================
const claudeDraft = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
if (claudeDraft && claudeDraft.parameters?.messages?.messageValues) {
    // The user message is messageValues[1] (index 1)
    const msgValues = claudeDraft.parameters.messages.messageValues;
    // Find the user-facing (non-system or the main) message — it's the one with the keywords/assignment
    const mainMsg = msgValues.find(m => {
        const text = m.message || '';
        return text.includes('Your Content Assignment') || text.includes('content assignment') || text.includes('brief_title');
    });

    if (!mainMsg) {
        fixes.push('FIX 4 ⚠️ Claude Draft: Could not find main message in messageValues');
    } else if ((mainMsg.message || '').includes('Client Site Researcher')) {
        fixes.push('FIX 4 ℹ️  Claude Draft already references Client Site Researcher — skipping');
    } else {
        const content = mainMsg.message || '';
        // Find the content assignment section
        const assignmentMarker = '# Your Content Assignment';
        const idx = content.indexOf(assignmentMarker);

        const clientIntelInjection = [
            '',
            '# Verified Client Intelligence (USE THESE FACTS — do not invent client-specific details)',
            'These details were verified directly from the client\'s website. Reference them naturally:',
            '{{ $(\'Client Site Researcher\').first().json.choices[0].message.content }}',
            '',
            'Structured Client Profile:',
            '{{ $(\'Client Profile Extractor\').first().json.message.content }}',
            '',
        ].join('\n');

        if (idx !== -1) {
            mainMsg.message = content.slice(0, idx) + clientIntelInjection + content.slice(idx);
            fixes.push('FIX 4 ✅ Claude Draft: Injected Client Site Researcher + Client Profile Extractor output before content assignment');
        } else {
            // Try to inject before quality check section
            const qualityMarker = '# Quality Check';
            const qIdx = content.indexOf(qualityMarker);
            if (qIdx !== -1) {
                mainMsg.message = content.slice(0, qIdx) + clientIntelInjection + content.slice(qIdx);
                fixes.push('FIX 4 ✅ Claude Draft: Injected client intel before quality check section');
            } else {
                mainMsg.message = content + clientIntelInjection;
                fixes.push('FIX 4 ✅ Claude Draft: Appended client intel to message (markers not found)');
            }
        }
    }
}

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('\n========================================');
console.log('TARGETED FIXES APPLIED:');
console.log('========================================');
fixes.forEach(f => console.log(f));
console.log('\nReady to push to n8n.');
