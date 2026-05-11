const fs = require('fs');

const data = JSON.parse(fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8'));

let fixed = 0;
data.nodes.forEach(n => {
  if (n.name === 'Pre-Draft Fact Checker' || n.name === 'Post-Draft Fact Checker') {
    if (n.parameters && n.parameters.messages && n.parameters.messages.values) {
      n.parameters.messages.message = n.parameters.messages.values;
      delete n.parameters.messages.values;
      fixed++;
    }
  }
});

fs.writeFileSync('TEST Skywide Content (Prompt Review).json', JSON.stringify(data, null, 2), 'utf8');

console.log('Fixed', fixed, 'nodes.');
