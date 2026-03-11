const fs = require('fs');
const d = JSON.parse(fs.readFileSync('DEV Skywide  Content (TEST v23).json', 'utf8'));

['If', 'If1', 'If2', 'If3'].forEach(name => {
    console.log("Connections from " + name + ":");
    console.dir(d.connections[name], { depth: null });
});

const draft = d.nodes.find(n => n.name.includes('OpenAI Draft'));
console.log("Draft Node Instructions regarding FAQ:");
console.log(draft.parameters.systemMessage);

