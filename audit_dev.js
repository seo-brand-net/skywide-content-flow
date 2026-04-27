const fs = require('fs');
const dev = JSON.parse(fs.readFileSync('DEV Skywide  Content.json', 'utf8'));
const old = JSON.parse(fs.readFileSync('TEST Skywide  Content old.json', 'utf8'));

// All DEV node names
console.log('=== ALL DEV NODES ===');
dev.nodes.forEach(n => console.log(n.type.split('.').pop().padEnd(28), '|', n.name));

// Final exit points in DEV — what do these nodes connect to?
const exitNodes = [
  '80 +?4', 'Check Max Iterations2',
  '80 +?6', 'Check Max Iterations3',
  'Document Export Sanitization3', 'Document Export Sanitization4',
  'Document Export Sanitization6', 'Document Export Sanitization7',
];

console.log('\n=== DEV EXIT NODE CONNECTIONS ===');
exitNodes.forEach(name => {
  const conn = dev.connections[name];
  if (conn) {
    console.log(name, '->', JSON.stringify(conn).substring(0, 200));
  } else {
    console.log(name, '-> NO CONNECTIONS');
  }
});

// Also check if DEV has QA Rewriter Agent connections
console.log('\n=== QA REWRITER / IF CONNECTIONS IN DEV ===');
['QA Rewriter Agent','QA Rewriter Agent1','QA Rewriter Agent2','QA Rewriter Agent3',
 'If','If1','If2','If3'].forEach(name => {
  if (dev.connections[name]) console.log(name, '->', JSON.stringify(dev.connections[name]).substring(0, 200));
});

// Send Test Result full params from old
const str = old.nodes.find(n => n.name === 'Send Test Result');
console.log('\n=== SEND TEST RESULT position in old ===', str ? str.position : 'NOT FOUND');
