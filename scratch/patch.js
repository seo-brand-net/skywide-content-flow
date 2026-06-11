const fs = require('fs');
const wfPath = 'DEV Skywide Content (Word Count Fix).json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

let modified = false;

// 1. Fix Keyword Strategist
const ks = wf.nodes.find(n => n.name === 'Keyword Strategist');
if (ks) {
  let code = ks.parameters.jsCode;
  
  code = code.replace(
    'const rawPrimary = input.primary_keywords;',
    'const rawPrimary = input.primary_keyword || input.primary_keywords;'
  );
  
  if (!code.includes('target_word_count:')) {
    code = code.replace(
      'return {\n  json: {',
      'const wc = input.word_count && parseInt(input.word_count) > 100 ? parseInt(input.word_count) : 1500;\nreturn {\n  json: {\n    target_word_count: wc,'
    );
  }
  
  ks.parameters.jsCode = code;
  modified = true;
  console.log('Keyword Strategist fixed.');
}

// 2. Fix Claims Extractor Output Parser
const ceop = wf.nodes.find(n => n.name === 'Claims Extractor Output Parser');
if (ceop) {
  const newSchema = {
    placement_manifest: [
      {
        target_section: "H2 section heading this claim belongs to",
        claim_text: "The exact claim, statistic, citation, or link text to include",
        source: "Brief | Website | Both",
        placement_instruction: "Exact instruction from the brief",
        claim_type: "statistic | citation | regulation | credential | internal_link | org_attribution | named_expert | client_stat | general_citation",
        requires_verification: true
      }
    ],
    forbidden_patterns: ["string"]
  };
  ceop.parameters.jsonSchemaExample = JSON.stringify(newSchema, null, 2);
  modified = true;
  console.log('Claims Extractor Output Parser fixed.');
}

// 3. Fix Verified Claims Output Parser
const vcop = wf.nodes.find(n => n.name === 'Verified Claims Output Parser');
if (vcop) {
  const newVerSchema = {
    summary: {
      total_input: 10,
      total_verified: 8,
      total_corrected: 1,
      total_dropped: 1
    },
    verified_placement_manifest: [
      {
        target_section: "H2 section heading this claim belongs to",
        claim_text: "The exact verified claim text",
        placement_instruction: "Exact instruction from the brief",
        verified_source_url: "URL from verification"
      }
    ]
  };
  vcop.parameters.jsonSchemaExample = JSON.stringify(newVerSchema, null, 2);
  modified = true;
  console.log('Verified Claims Output Parser fixed.');
}

if (modified) {
  fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
  console.log('Workflow file saved!');
} else {
  console.log('No modifications made.');
}
