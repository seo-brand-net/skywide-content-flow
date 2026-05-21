const fs = require('fs');
const workflowPath = './GBP Post Automation v2.json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const index = data.nodes.findIndex(n => n.name === 'Generate Image with DALL-E');
if (index !== -1) {
  let jsonBody = data.nodes[index].parameters.jsonBody;
  
  // Safely inject response_format: "url" before the closing brace
  if (!jsonBody.includes('"response_format"')) {
    jsonBody = jsonBody.replace('}', '  ,"response_format": "url"\n}');
    data.nodes[index].parameters.jsonBody = jsonBody;
  }
}

fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('Successfully injected response_format: "url".');
