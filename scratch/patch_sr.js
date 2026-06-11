const fs = require('fs');
const wfPath = 'DEV Skywide Content (Word Count Fix).json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

const sr = wf.nodes.find(n => n.name === 'Surgical Rewriter');
if (sr) {
  let prompt = sr.parameters.text;
  
  if (!prompt.includes('CONTEXT AWARENESS')) {
    const contextInjection = `
CONTEXT AWARENESS (Use if needed to apply corrections):
Primary Keyword: {{ $('Keyword Strategist').first().json.primary_keyword_joined || 'None' }}
Secondary Keywords: {{ $('Keyword Strategist').first().json.secondary_keywords_arr?.join(', ') || 'None' }}
Target Word Count: {{ $('Keyword Strategist').first().json.target_word_count || 1500 }}
Required Headings:
{{ $('Keyword Strategist').first().json.detected_brief_headings?.join('\\n') || 'None' }}
`;

    prompt = prompt.replace(
      'CORRECTIONS NEEDED:',
      contextInjection + '\nCORRECTIONS NEEDED:'
    );
    
    sr.parameters.text = prompt;
    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log('Surgical Rewriter patched.');
  } else {
    console.log('Surgical Rewriter already patched.');
  }
} else {
  console.log('Surgical Rewriter not found.');
}
