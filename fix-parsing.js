const fs = require('fs');
const data = JSON.parse(fs.readFileSync('DEV Skywide  Content.json', 'utf-8'));
const strateg = data.nodes.find(n => n.name === 'Keyword Strategist');
strateg.parameters.jsCode = strateg.parameters.jsCode.replace('aiData = JSON.parse(aiOutputRAW);', 'if (typeof aiOutputRAW === "object") { aiData = aiOutputRAW; } else { aiData = JSON.parse(aiOutputRAW); }');
fs.writeFileSync('DEV Skywide  Content.json', JSON.stringify(data, null, 2));
console.log('Fixed JS!');
