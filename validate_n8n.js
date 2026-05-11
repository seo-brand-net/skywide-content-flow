const fs = require('fs');
try {
  const content = fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8');
  const data = JSON.parse(content);
  console.log('JSON parse successful.');

  const nodeNames = new Set(data.nodes.map(n => n.name));
  let issues = 0;

  // Check nodes
  data.nodes.forEach(n => {
    if (!n.name) { console.error('Node missing name:', n.id); issues++; }
    if (!n.type) { console.error('Node missing type:', n.name); issues++; }
    if (!n.id) { console.error('Node missing id:', n.name); issues++; }
  });

  // Check connections
  for (const [sourceNode, conns] of Object.entries(data.connections)) {
    if (!nodeNames.has(sourceNode)) {
      console.error('Connection from non-existent node:', sourceNode);
      issues++;
    }
    for (const [type, targets] of Object.entries(conns)) {
      targets.forEach((targetArr, i) => {
        targetArr.forEach(t => {
          if (!nodeNames.has(t.node)) {
            console.error(`Connection to non-existent node: ${sourceNode} -> ${t.node}`);
            issues++;
          }
        });
      });
    }
  }

  if (issues === 0) console.log('No obvious structural issues found in nodes/connections.');
  else console.log('Total issues:', issues);
} catch (e) {
  console.error('JSON Parse Error:', e);
}
