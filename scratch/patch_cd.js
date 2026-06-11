const fs = require('fs');
const wfPath = 'DEV Skywide Content (Word Count Fix).json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

const cd = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
if (cd) {
  let prompt = cd.parameters.text;
  
  // Replace direct webhook references with Keyword Strategist safe outputs
  prompt = prompt.replace(
    /\{\{\s*\$\('Webhook1'\)\.first\(\)\.json\.body\.word_count\s*\}\}/g,
    "{{ $('Keyword Strategist').first().json.target_word_count }}"
  );
  
  prompt = prompt.replace(
    /\{\{\s*\$\('Webhook1'\)\.first\(\)\.json\.body\.primary_keywords\s*\}\}/g,
    "{{ $('Keyword Strategist').first().json.primary_keyword_joined || 'None' }}"
  );
  
  prompt = prompt.replace(
    /\{\{\s*\$\('Webhook1'\)\.first\(\)\.json\.body\.primary_keyword\s*\}\}/g,
    "{{ $('Keyword Strategist').first().json.primary_keyword_joined || 'None' }}"
  );
  
  prompt = prompt.replace(
    /\{\{\s*\$\('Webhook1'\)\.first\(\)\.json\.body\.secondary_keywords\s*\}\}/g,
    "{{ $('Keyword Strategist').first().json.secondary_keywords_arr ? $('Keyword Strategist').first().json.secondary_keywords_arr.join(', ') : 'None' }}"
  );

  cd.parameters.text = prompt;
  fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
  console.log('Claude Draft prompt patched for Webhook fallbacks.');
} else {
  console.log('Claude Draft node not found.');
}
