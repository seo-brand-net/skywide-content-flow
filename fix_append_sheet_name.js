const fs = require('fs');
const workflowPath = './GBP Post Automation v2.json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const index = data.nodes.findIndex(n => n.name === 'Append to Location Tab');
if (index !== -1) {
  data.nodes[index].parameters.sheetName.value = "={{ $('Webhook Trigger').item.json.body.tab_name || 'GBP Posts' }}";
}

fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('Successfully updated sheetName in Append to Location Tab.');
