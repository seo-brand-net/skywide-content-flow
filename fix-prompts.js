const fs = require('fs');
const data = JSON.parse(fs.readFileSync('DEV Skywide  Content.json', 'utf-8'));
let modified = 0;

data.nodes.forEach(n => {
    if (!n.parameters) return;
    
    let pStr = JSON.stringify(n.parameters);
    if (pStr.includes('faq_injection') && !pStr.includes('brief_enforcer_injection')) {
        console.log('Patching node:', n.name);
        
        let newPStr = pStr.replace(/(\{\{\s*\$\('Keyword Strategist'\)\.item\.json\.faq_injection\s*\}\})/g, "{{ $('Keyword Strategist').item.json.brief_enforcer_injection }}\\n\\n$1");
        
        if (newPStr !== pStr) {
            n.parameters = JSON.parse(newPStr);
            modified++;
        }
    }
});

if (modified > 0) {
    fs.writeFileSync('DEV Skywide  Content.json', JSON.stringify(data, null, 2));
    console.log('Successfully patched', modified, 'locations missing brief_enforcer_injection!');
} else {
    console.log('No locations needed patching.');
}
