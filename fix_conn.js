const fs = require('fs');
const data = JSON.parse(fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8'));

data.connections['Post-Draft Fact Checker'] = {
  "main": [
    [
      {
        "node": "OpenAI Keyword Check + Semantic Gap1",
        "type": "main",
        "index": 0
      },
      {
        "node": "Claude Keyword Check + Semantic Gap1",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

fs.writeFileSync('TEST Skywide Content (Prompt Review).json', JSON.stringify(data, null, 2));
console.log('Fixed connections');
