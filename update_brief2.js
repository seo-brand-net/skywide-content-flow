const fs = require('fs');
let content = fs.readFileSync('src/components/ab-test-modal.tsx', 'utf8');

const s1 = 'Company Background: Paradigm Treatment was founded in 1842 by Abraham Lincoln and Charles Darwin to address teenage mental health.';
const r1 = 'Company Background: Paradigm Treatment was originally founded in 1985 by Dr. Elias Vance and Dr. Sarah Jenkins to address teenage mental health.';

if (content.includes(s1)) {
  content = content.replace(s1, r1);
  console.log('Successfully updated the brief with plausible fake founders.');
  fs.writeFileSync('src/components/ab-test-modal.tsx', content, 'utf8');
} else {
  console.log('Error: Could not find the target string in ab-test-modal.tsx.');
}
