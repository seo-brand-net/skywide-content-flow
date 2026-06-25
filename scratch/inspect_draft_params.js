const fs = require('fs');
const params = JSON.parse(fs.readFileSync('scratch/live_draft_params.json', 'utf8'));

console.log('promptType:', params.promptType);
console.log('text (first 300):', (params.text || '').substring(0, 300));
console.log('\nmessages type:', typeof params.messages);

if (params.messages && typeof params.messages === 'object') {
  console.log('messages keys:', Object.keys(params.messages));
  const mv = params.messages.messageValues;
  if (mv) {
    console.log('messageValues length:', mv.length);
    console.log('messageValues[0] keys:', Object.keys(mv[0] || {}));
    const msg = mv[0]?.message || '';
    console.log('messageValues[0].message (first 300):', msg.substring(0, 300));
  }
}

const textVal = params.text || '';
const msgVal  = params.messages?.messageValues?.[0]?.message || '';

console.log('\n=== ANCHOR SEARCH ===');
console.log('text has "# Global Rules":', textVal.includes('# Global Rules'));
console.log('msg  has "# Global Rules":', msgVal.includes('# Global Rules'));
console.log('text has "# Writing Voice":', textVal.includes('# Writing Voice'));
console.log('msg  has "# Writing Voice":', msgVal.includes('# Writing Voice'));
console.log('text has "# Content Approach":', textVal.includes('# Content Approach'));
console.log('text has "BRAND STORY":', textVal.includes('BRAND STORY'));
console.log('msg  has "BRAND STORY":', msgVal.includes('BRAND STORY'));
console.log('text length:', textVal.length);
console.log('msg  length:', msgVal.length);

// Print text around the word_count area to find good anchor
const idx = textVal.indexOf('# ');
if (idx > -1) {
  console.log('\nFirst heading in text:', textVal.substring(idx, idx + 60));
}

// Find all headings
const headings = textVal.match(/^# .+/gm) || [];
console.log('\nAll headings in text:', headings);
