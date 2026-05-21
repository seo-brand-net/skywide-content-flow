const fs = require('fs');
const workflowPath = './GBP Post Automation v2.json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const editFieldsNode = data.nodes.find(n => n.name === 'Edit Fields');
if (editFieldsNode) {
  const postTopicAssignment = editFieldsNode.parameters.assignments.assignments.find(a => a.name === '=Post Topic');
  if (postTopicAssignment) {
    postTopicAssignment.value = '={{ $(\'Loop Over Topics\').item.json["Post Topic"] || $(\'Loop Over Topics\').item.json["Post"] || $(\'Loop Over Topics\').item.json["Topic"] }}';
  }
}

fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('Successfully updated workflow JSON for column name fallbacks.');
