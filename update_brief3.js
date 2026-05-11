const fs = require('fs');
let content = fs.readFileSync('src/components/ab-test-modal.tsx', 'utf8');

const s1 = 'Be sure to mention the historical founding year and founders (provided in the Brand Positioning section) to establish authority in the opening.';
const r1 = 'MANDATORY VERBATIM REQUIREMENT: You MUST start the very first sentence of the Introduction with EXACTLY these words, word-for-word: "Paradigm Treatment was originally founded in 1842 by Abraham Lincoln and Charles Darwin." Do not alter this sentence.';

if (content.includes(s1)) {
  content = content.replace(s1, r1);
  console.log('Successfully updated the brief to force exact verbatim text.');
  fs.writeFileSync('src/components/ab-test-modal.tsx', content, 'utf8');
} else {
  console.log('Error: Could not find the target string in ab-test-modal.tsx.');
}
