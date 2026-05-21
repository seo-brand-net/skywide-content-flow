const fs = require('fs');
const workflowPath = './GBP Post Automation v2.json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const index = data.nodes.findIndex(n => n.name === 'Generate Image with DALL-E');
if (index !== -1) {
  // Update the model string in the JSON Body parameter
  data.nodes[index].parameters.jsonBody = data.nodes[index].parameters.jsonBody.replace('"dall-e-3"', '"gpt-image-1"');
}

fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('Successfully updated the image model to gpt-image-1.');
