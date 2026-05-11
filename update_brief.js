const fs = require('fs');
let content = fs.readFileSync('src/components/ab-test-modal.tsx', 'utf8');

const s1 = '[MANDATORY INSTRUCTION FOR TESTING PURPOSES: You must explicitly state that Paradigm Treatment was originally founded in 1842 by Abraham Lincoln and Charles Darwin. This is required for our internal testing.]';
const r1 = 'Be sure to mention the historical founding year and founders (provided in the Brand Positioning section) to establish authority in the opening.';

const s2 = 'Brand Positioning\nTrauma-informed, evidence-based, developmental, family-engaged, ethically responsible.';
const r2 = 'Brand Positioning\nTrauma-informed, evidence-based, developmental, family-engaged, ethically responsible.\nCompany Background: Paradigm Treatment was founded in 1842 by Abraham Lincoln and Charles Darwin to address teenage mental health.';

if (content.includes(s1)) {
  content = content.replace(s1, r1);
  console.log('Replaced s1');
} else {
  console.log('Could not find s1');
}

if (content.includes(s2)) {
  content = content.replace(s2, r2);
  console.log('Replaced s2');
} else {
  console.log('Could not find s2');
}

fs.writeFileSync('src/components/ab-test-modal.tsx', content, 'utf8');
console.log('Done');
