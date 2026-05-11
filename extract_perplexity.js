const fs = require('fs');
const data = JSON.parse(fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8'));

const targetNodeName = 'Data Check & Research Gaps1';
const targetNode = data.nodes.find(n => n.name === targetNodeName);
console.log('--- NODE ---');
console.log(JSON.stringify(targetNode, null, 2));

console.log('\n--- INCOMING CONNECTIONS ---');
for (const [nodeName, nodeConns] of Object.entries(data.connections)) {
  for (const [outputType, targets] of Object.entries(nodeConns)) {
    targets.forEach((targetsArr) => {
      targetsArr.forEach(t => {
        if (t.node === targetNodeName) {
          console.log(`From ${nodeName} (${outputType}) -> ${targetNodeName}`);
        }
      });
    });
  }
}

console.log('\n--- OUTGOING CONNECTIONS ---');
if (data.connections[targetNodeName]) {
  console.log(JSON.stringify(data.connections[targetNodeName], null, 2));
} else {
  console.log('No outgoing connections');
}
