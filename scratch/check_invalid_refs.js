const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

wf.nodes.forEach(n => {
    if (n.parameters) {
        let pStr = JSON.stringify(n.parameters);
        
        const openAIMatches = pStr.match(/\$\('OpenAI [^']+'\)/g);
        if (openAIMatches) {
            console.log(`Node '${n.name}' references OpenAI:`, [...new Set(openAIMatches)]);
        }
        
        const modelMatches = pStr.match(/\$\('Model — [^']+'\)/g);
        if (modelMatches) {
            console.log(`Node '${n.name}' references Model:`, [...new Set(modelMatches)]);
        }
    }
});
