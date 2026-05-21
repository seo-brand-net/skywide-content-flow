const fs = require('fs');
const workflowPath = './GBP Post Automation v2.json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const httpNode = data.nodes.find(n => n.name === 'HTTP Request');
if (httpNode) {
  // Update to use the hardcoded SEO Brand XML URL
  httpNode.parameters.url = "https://www.seobrand.com/page-sitemap.xml";
}

fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('Successfully updated workflow JSON for static XML URL.');
