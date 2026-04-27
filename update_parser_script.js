const fs = require('fs');

const FILE = 'DEV Skywide  Content.json';
console.log('Reading workflow file...');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let updated = false;

data.nodes.forEach((n, idx) => {
    if (n.name === 'Keyword Strategist' && n.type === 'n8n-nodes-base.code') {
        let code = n.parameters.jsCode || n.parameters.code;

        // Replace the FAQ parsing logic
        const oldFaQStartPos = code.indexOf('let briefFAQs = [];');
        const oldFaQEndPos = code.indexOf('let briefHeadings = [];');
        
        if (oldFaQStartPos > -1 && oldFaQEndPos > -1) {
            const newFaqLogic = `let briefFAQs = [];

const faqHeaderRegex = /(?:^\\d+[\\.)]\\s*)?(?:FAQ\\s*Section|FAQ[s]?\\s*[:(]?|Frequently\\s+Asked\\s+Questions)[\\s\\r\\n]+/img;

let match;
while ((match = faqHeaderRegex.exec(creativeBrief)) !== null) {
  const startIndex = match.index + match[0].length;
  const afterFaq = creativeBrief.substring(startIndex, startIndex + 3000);
  const lines = afterFaq.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const questions = [];
  for (const line of lines) {
    if (/^(?:H[2-4]|##|Meta|Title|Tone|Brand|Audience|Internal|CTA|Key\\s*Takeaway|Conclusion|Content\\s*Outline|Table\\s*of\\s*Contents)/i.test(line)) {
       if (questions.length > 0) break;
       break;
    }
    
    if (/^\\d+[\\.)]\\s*(?:Conclusion|Key Takeaway)/i.test(line)) break;

    let cleaned = line.trim();
    if (cleaned.startsWith('-') || cleaned.startsWith('*') || cleaned.startsWith('•')) {
      cleaned = cleaned.substring(1).trim();
    }
    cleaned = cleaned.replace(/^\\d+[.)\\s]+/, '').trim();
    
    if (/^Q\\d*[:\\s]+/i.test(cleaned)) {
      let qPart = cleaned.replace(/^Q\\d*[:\\s]+/i, '');
      let qmIndex = qPart.indexOf('?');
      if (qmIndex > -1) {
          questions.push(qPart.substring(0, qmIndex + 1).trim());
      } else {
          questions.push(qPart.split(/\\sA\\d*:\\s/i)[0].trim());
      }
    } else if (cleaned.toLowerCase().startsWith('q:')) {
      let qPart = cleaned.substring(2).trim();
      let qmIndex = qPart.indexOf('?');
      if (qmIndex > -1) {
          questions.push(qPart.substring(0, qmIndex + 1).trim());
      }
    } else if (cleaned.endsWith('?') && cleaned.length > 10) {
      questions.push(cleaned);
    }
  }
  
  if (questions.length >= 2) {
      briefFAQs = questions;
      break; 
  } else if (questions.length > 0 && briefFAQs.length === 0) {
      briefFAQs = questions; 
  }
}

if (briefFAQs.length === 0) {
  const lines = creativeBrief.split('\\n');
  const allQs = [];
  for (const l of lines) {
    let clean = l.trim();
    if (/^Q\\d*[:\\s]+/i.test(clean) && clean.includes('?')) {
        let qPart = clean.replace(/^Q\\d*[:\\s]+/i, '');
        let qmIndex = qPart.indexOf('?');
        if (qmIndex > -1) allQs.push(qPart.substring(0, qmIndex + 1).trim());
    }
  }
  if (allQs.length > 0) briefFAQs = allQs;
}

`;
            code = code.substring(0, oldFaQStartPos) + newFaqLogic + code.substring(oldFaQEndPos);
        }

        // Replace Headings parsing logic
        const oldHeadingsStartPos = code.indexOf('let briefHeadings = [];');
        const oldHeadingsEndPos = code.indexOf('// ========== Build injection strings');
        
        if (oldHeadingsStartPos > -1 && oldHeadingsEndPos > -1) {
            const newHeadingsLogic = `let briefHeadings = [];
const headingLines = creativeBrief.split('\\n');
let inHeadingsSection = false;
for (let i = 0; i < headingLines.length; i++) {
  const line = headingLines[i].trim();
  if (!inHeadingsSection) {
    if (/(?:H2[s]?|Headings?|Outline|Structure|Sections?|Table of Contents)[\\s:]*$/i.test(line) || 
        line.toLowerCase() === 'content outline & writing instructions') {
      inHeadingsSection = true;
    }
  } else {
    if (/(?:FAQ[s]?|Frequently Asked Questions)/i.test(line) && !line.includes('?')) break;
    if (/^\\d+\\.\\s*Conclusion/i.test(line) || line === 'Conclusion') break;
    
    if (line.length > 0) {
      let cleaned = line.replace(/^[-*•]\\s*/, '').replace(/^\\d+[.)\\s]+/, '').replace(/^H[23]:\\s*/i, '');
      cleaned = cleaned.split(/Purpose:/i)[0].trim();
      cleaned = cleaned.replace(/\\s*\\([^)]*\\)\\s*$/, '').trim();
      
      if (cleaned.length > 3 && !/^(?:H2[s]?|Headings?|Outline|Structure|Sections?|Table of Contents)[\\s:]*$/i.test(cleaned)) {
         briefHeadings.push(cleaned);
      }
    }
  }
}

`;
            code = code.substring(0, oldHeadingsStartPos) + newHeadingsLogic + code.substring(oldHeadingsEndPos);
        }

        if (n.parameters.jsCode !== undefined) {
             n.parameters.jsCode = code;
        } else {
             n.parameters.code = code;
        }
        
        updated = true;
        console.log(`✅ Updated Keyword Strategist (index ${idx})`);
    }
});

if (updated) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('\\n✅ Done! File saved.');
} else {
    console.log('No changes made.');
}
