const fs = require('fs');
const path = 'c:/Users/USER/Documents/Projects/production/skywide/DEV Skywide Content (Word Count Fix).json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// ── 1. Pre-Draft Fact Checker ────────────────────────────────────────────────
const preDraft = data.nodes.find(n => n.name === 'Pre-Draft Fact Checker');
if (preDraft) {
    const msgs = preDraft.parameters.messages.message;

    // System message: inject client URL awareness at the very top
    const clientUrlBlock = [
        '=',
        "{{ $('Webhook1').first().json.body.client_website_url",
        "  ? 'PRIORITY: CLIENT WEBSITE RESEARCH REQUIRED\\n\\nThe client\\'s website URL has been provided: ' + $('Webhook1').first().json.body.client_website_url + '\\n\\nBefore checking anything else, search this URL (site:' + $('Webhook1').first().json.body.client_website_url + ') to extract:\\n- Services and products the client actually offers\\n- Locations and service areas\\n- Credentials, certifications, and awards\\n- Named team members\\n- Unique claims the client makes about themselves\\n\\nThis client-sourced data is your PRIMARY source of truth. Any claim in the article that contradicts what is published on the client site must be flagged for removal.'",
        "  : 'NOTE: No client website URL was provided. Perform general web fact-checking only. Flag any client-specific service or product claims that cannot be independently verified.' }}",
        '',
        'You are an elite Fact-Checker, Brief Auditor, and Client Research Analyst. Read the provided content brief. Extract all factual claims',
    ].join('\n');

    if (msgs[0] && msgs[0].content) {
        msgs[0].content = msgs[0].content.replace(
            /^=You are an elite Fact-Checker and Brief Auditor\./,
            clientUrlBlock
        );
        console.log('Pre-Draft Fact Checker — system message patched');
    }

    // User message: add client name and URL before the brief
    if (msgs[1] && msgs[1].content) {
        msgs[1].content = msgs[1].content.replace(
            /^=Brief Data to Audit:/m,
            "=Client Name: {{ $('Webhook1').first().json.body.client_name }}\nClient Website: {{ $('Webhook1').first().json.body.client_website_url || 'Not provided' }}\n\nBrief Data to Audit:"
        );
        console.log('Pre-Draft Fact Checker — user message patched');
    }
} else {
    console.error('ERROR: Pre-Draft Fact Checker not found');
}

// ── 2. Post-Draft Fact Checker ───────────────────────────────────────────────
const postDraft = data.nodes.find(n => n.name === 'Post-Draft Fact Checker');
if (postDraft) {
    const msgs = postDraft.parameters.messages.message;

    if (msgs[1] && msgs[1].content) {
        msgs[1].content = msgs[1].content.replace(
            /^=ORIGINAL BRIEF \(for citation and requirement cross-checking\):/m,
            [
                "=CLIENT: {{ $('Webhook1').first().json.body.client_name }}",
                "CLIENT WEBSITE: {{ $('Webhook1').first().json.body.client_website_url || 'Not provided' }}",
                "{{ $('Webhook1').first().json.body.client_website_url ? 'PRIORITY INSTRUCTION: Before verifying general facts, cross-check ALL client-specific claims (services, products, team members, credentials, service areas) against the client website above. Any claim about the client that is NOT verifiable on their website must be REMOVED or replaced with hedging language (e.g., \"may offer\", \"contact for details\").' : '' }}",
                '',
                'ORIGINAL BRIEF (for citation and requirement cross-checking):',
            ].join('\n')
        );
        console.log('Post-Draft Fact Checker — user message patched');
    }
} else {
    console.error('ERROR: Post-Draft Fact Checker not found');
}

// ── 3. Keyword Strategist — expose client_website_url downstream ─────────────
const ks = data.nodes.find(n => n.name === 'Keyword Strategist');
if (ks) {
    let code = ks.parameters.jsCode;
    const target = 'detected_custom_rules:          briefCustomRules,';
    const replacement = 'detected_custom_rules:          briefCustomRules,\n    client_website_url:             input.client_website_url || null,';
    if (code.includes(target) && !code.includes('client_website_url')) {
        ks.parameters.jsCode = code.replace(target, replacement);
        console.log('Keyword Strategist — client_website_url added to output');
    } else if (code.includes('client_website_url')) {
        console.log('Keyword Strategist — client_website_url already present, skipping');
    } else {
        console.error('ERROR: Could not find target string in Keyword Strategist code');
    }
} else {
    console.error('ERROR: Keyword Strategist not found');
}

// ── Validate and save ────────────────────────────────────────────────────────
fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('\nWorkflow saved. Validating...');

// Quick validation
const reloaded = JSON.parse(fs.readFileSync(path, 'utf8'));
console.log('JSON is valid. Total nodes:', reloaded.nodes.length);
