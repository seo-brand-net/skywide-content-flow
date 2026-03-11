const fs = require('fs');
const d = JSON.parse(fs.readFileSync('DEV Skywide  Content (TEST v23).json', 'utf8'));

['AI Agent', 'AI Agent1', 'AI Agent2', 'AI Agent3'].forEach(name => {
    console.log("Connections from " + name + ":");
    console.dir(d.connections[name], { depth: null });
});

['FAQ Schema Generator', 'FAQ Schema Generator1', 'FAQ Schema Generator2', 'FAQ Schema Generator3'].forEach(name => {
    console.log("Connections from " + name + ":");
    console.dir(d.connections[name], { depth: null });
});

['Append FAQ to Article', 'Append FAQ to Article1', 'Append FAQ to Article2', 'Append FAQ to Article3'].forEach(name => {
    console.log("Connections from " + name + ":");
    console.dir(d.connections[name], { depth: null });
});
