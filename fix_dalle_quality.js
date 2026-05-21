const fs = require('fs');
const workflowPath = './GBP Post Automation v2.json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const index = data.nodes.findIndex(n => n.name === 'Generate Image with DALL-E');
if (index !== -1) {
  // Replace quality parameter
  data.nodes[index].parameters.jsonBody = data.nodes[index].parameters.jsonBody.replace('"quality": "standard"', '"quality": "auto"');
}

fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('Successfully updated the image quality parameter to auto.');
