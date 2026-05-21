/**
 * fix_parser_prompt.js
 * Updates the Parse Creative Brief (LLM) node in DEV to stop it from
 * extracting administrative fields (like "Target Audience") as article headings.
 */

const fs = require('fs');
const DEV_FILE  = 'DEV Skywide Content (Word Count Fix).json';

const dev  = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'));

let changes = 0;

const parserNode = dev.nodes.find(n => n.name === 'Parse Creative Brief (LLM)');
if (parserNode) {
  const oldPrompt = parserNode.parameters.messages.values[0].content;
  
  const newPrompt = `=You are an exact structural extraction component. Your sole job is to extract the intended article H2 headings and any explicit FAQs from the Creative Brief provided. You must return ONLY raw valid JSON conforming to this snippet: {"headings": ["Heading 1", "Heading 2"], "faqs": [{"question": "Q1...", "answer": "A1..."}]}. If no answer is present for a FAQ, use an empty string. 

CRITICAL EXCLUSIONS:
Do NOT extract administrative or metadata fields as headings. You must IGNORE sections like:
- Target Audience
- Audience
- Search Intent
- Primary Goal
- Target Service Area
- Internal Linking Requirements
- Keywords
- Target Keywords
- Secondary Keywords
- SEO Specifications
- URL Slug
- Title Tag
- Meta Description
- References
- Content Pillar Role
- Funnel Stage
- Article Type
- Tone
- H1 Recommendation
- Suggested Lead Paragraph
- Introduction

Only extract the actual headings that are intended to be read by the end-user in the final article body.`;

  parserNode.parameters.messages.values[0].content = newPrompt;
  changes++;
  console.log('✅ Upgraded Parse Creative Brief (LLM) system prompt');
}

if (changes > 0) {
    fs.writeFileSync(DEV_FILE, JSON.stringify(dev, null, 2), 'utf8');
    console.log('\\n✅ Saved changes to', DEV_FILE);
    console.log('Next: Re-import the updated DEV workflow into n8n.');
} else {
    console.log('\\n❌ No changes made.');
}
