const fs = require('fs');

const research = fs.readFileSync('scratch/3004_Client_Site_Researcher.txt', 'utf8');
const profile  = fs.readFileSync('scratch/3004_Client_Profile_Extractor.txt', 'utf8');
const article  = fs.readFileSync('scratch/billy_check_output.txt', 'utf8');

const checks = [
  'ISA', 'TCIA', 'credential', 'certified', 'insurance',
  'termite', 'winter', 'septic', 'french creek',
  'ISA-certified', 'TCIA credential'
];

console.log('=== CLIENT SITE RESEARCHER — KEY CLAIM CHECK ===\n');
checks.forEach(term => {
  const regex = new RegExp('.{0,100}' + term + '.{0,100}', 'gi');
  const matches = research.match(regex);
  if (matches) {
    console.log('[' + term + '] FOUND on website:');
    matches.slice(0, 2).forEach(m => console.log('  >> ' + m.trim().substring(0, 200)));
  } else {
    console.log('[' + term + '] NOT found in website research');
  }
});

console.log('\n\n=== CLIENT PROFILE — CREDENTIALS ===');
console.log(profile.substring(0, 1000));

console.log('\n\n=== ARTICLE FAQ SECTION ===');
const faqIdx = article.indexOf('## Frequently Asked Questions');
if (faqIdx > -1) console.log(article.substring(faqIdx, faqIdx + 2000));

console.log('\n\n=== SECONDARY KEYWORD COUNT ===');
const kw = 'difference between stump grinding and stump removal';
const lower = article.toLowerCase();
let count = 0, pos = 0;
while ((pos = lower.indexOf(kw, pos)) !== -1) { count++; pos += kw.length; }
console.log('"' + kw + '" appears: ' + count + ' time(s) (brief required: 2)');

// Also check the 3-foot stump FAQ
const hasThreeFoot = article.toLowerCase().includes('3-foot') || article.toLowerCase().includes('three-foot') || article.toLowerCase().includes('3 foot');
console.log('\nFAQ: 3-foot stump timeframe present:', hasThreeFoot);
