const fs = require('fs');
const workflowPath = './GBP Post Automation v2.json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const dallENode = data.nodes.find(n => n.name === 'Generate Image with DALL-E');
if (dallENode) {
  dallENode.parameters.prompt = "={{ $json.choices[0].message.content }}";
}

fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('Successfully fixed DALL-E prompt expression.');
