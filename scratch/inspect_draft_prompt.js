const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// 1. Show how Claude Draft currently uses Pre-Draft Fact Checker
const claudeDraft = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
const msgValues = claudeDraft.parameters.messages.messageValues;
console.log('=== CLAUDE DRAFT messageValues count:', msgValues.length);
msgValues.forEach((m, i) => {
    const text = m.message || '';
    console.log(`\n--- messageValues[${i}] (${text.length} chars) SNIPPET ---`);
    // Print first 800 chars and also search for key references
    console.log(text.substring(0, 800));
    console.log('...');
    console.log('Contains Pre-Draft Fact Checker ref:', text.includes('Pre-Draft Fact Checker'));
    console.log('Contains Client Profile Extractor ref:', text.includes('Client Profile Extractor'));
    console.log('Contains Client Site Researcher ref:', text.includes('Client Site Researcher'));
    console.log('Contains json.body.creative_brief:', text.includes('creative_brief'));
});

// 2. Show the Pre-Draft Fact Checker node parameters to understand what prompt it runs
const pdfc = wf.nodes.find(n => n.name === 'Pre-Draft Fact Checker');
console.log('\n\n=== PRE-DRAFT FACT CHECKER node parameters ===');
const pdMessages = pdfc?.parameters?.messages?.message || [];
pdMessages.forEach((m, i) => {
    console.log(`\nMessage ${i} (${m.role}): ${JSON.stringify(m.content).substring(0, 500)}`);
});
