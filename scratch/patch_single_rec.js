const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const n = wf.nodes.find(n => n.name === 'Claude Apply Recommendations1');
if (n && n.parameters && typeof n.parameters.text === 'string') {
    let pStr = n.parameters.text;
    
    // Replace "Dual Recommendation Handling:" and its bullet points
    pStr = pStr.replace(/## Dual Recommendation Handling:[\s\S]*?## Integration Priorities:/, `## Recommendation Handling:\n- Implement the best suggestions from the analysis\n- Skip any recommendation that would sound forced, corporate, or break word count\n\n## Integration Priorities:`);
    
    // Replace "from both SEO analyses" with "from the SEO analysis"
    pStr = pStr.replace(/from both SEO analyses/g, 'from the SEO analysis');
    
    // Remove the OpenAI SEO Recommendations section entirely
    pStr = pStr.replace(/### OpenAI SEO Recommendations:\s*\{\{ \$\('OpenAI SEO Optimization1'\).first\(\).json.message\?\.content \|\| \$\('OpenAI SEO Optimization1'\).first\(\).json.choices\?\.\[0\]\?\.message\?\.content \}\}\s*/, '');
    
    n.parameters.text = pStr;
    
    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log('Successfully patched Claude Apply Recommendations1 to single-recommendation logic.');
} else {
    console.log('Could not find Claude Apply Recommendations1 or its text parameter.');
}
