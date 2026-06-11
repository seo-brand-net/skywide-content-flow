const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

// 1. Fix Claude Draft (Claude Opus 3)1
const draftNode = wf.nodes.find(n => n.name === 'Claude Draft (Claude Opus 3)1');
if (draftNode) {
  let pStr = JSON.stringify(draftNode.parameters);
  
  // Wrap the Keyword Strategist injections in XML tags
  // The old prompt has:
  // \n\n{{ $('Keyword Strategist').first().json.brief_enforcer_injection }}\n\n{{ $('Keyword Strategist').first().json.faq_injection }}
  // We will replace that exact string or just append to the prompt.
  
  if (pStr.includes("{{ $('Keyword Strategist').first().json.brief_enforcer_injection }}")) {
    pStr = pStr.replace(
      /\{\{ \$\('Keyword Strategist'\)\.first\(\)\.json\.brief_enforcer_injection \}\}(?:\\n)*\{\{ \$\('Keyword Strategist'\)\.first\(\)\.json\.faq_injection \}\}/g,
      "<MANDATORY_STRUCTURE>\\n{{ $('Keyword Strategist').first().json.brief_enforcer_injection }}\\n\\n{{ $('Keyword Strategist').first().json.faq_injection }}\\n</MANDATORY_STRUCTURE>"
    );
    draftNode.parameters = JSON.parse(pStr);
    console.log('Patched Claude Draft structure tags.');
  } else {
    console.log('Could not find injection tags in Claude Draft to wrap.');
  }
}

// 2. Fix Surgical Rewriter
const srNode = wf.nodes.find(n => n.name === 'Surgical Rewriter');
if (srNode) {
  let pStr = JSON.stringify(srNode.parameters);
  // The Surgical Rewriter prompt needs the FAQs and Creative brief.
  // We'll append it before the original text injection.
  const appendTarget = "Primary Keyword: {{ $('Keyword Strategist').first().json.primary_keyword_joined || 'None' }}";
  if (pStr.includes(appendTarget)) {
    const injection = appendTarget + "\\nSecondary Keywords: {{ $('Keyword Strategist').first().json.secondary_keywords_arr?.join(', ') || 'None' }}\\nRequired Headings:\\n{{ $('Keyword Strategist').first().json.detected_brief_headings?.join('\\\\n') || 'None' }}\\n\\nREQUIRED FAQS:\\n{{ $('Keyword Strategist').first().json.faq_injection }}\\n\\nRAW CREATIVE BRIEF:\\n{{ $('Webhook1').first().json.body.creative_brief }}\\n\\n";
    // First, let's remove the previous injection to avoid duplication
    pStr = pStr.replace(/Primary Keyword:.*?(?=Target Word Count:)/g, '');
    pStr = pStr.replace(/Target Word Count:/, injection + 'Target Word Count:');
    srNode.parameters = JSON.parse(pStr);
    console.log('Patched Surgical Rewriter context.');
  } else {
    console.log('Could not find target in Surgical Rewriter.');
  }
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log('Saved patched workflow.');
