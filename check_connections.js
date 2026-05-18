const fs = require('fs');
const test = JSON.parse(fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8'));
const dev  = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

const conn = test.connections;
const preIn = [], preOut = [], postIn = [], postOut = [];

Object.entries(conn).forEach(([src, outs]) => {
  (outs.main || []).forEach(targets => {
    (targets || []).forEach(t => {
      if (t.node === 'Pre-Draft Fact Checker') preIn.push(src);
      if (t.node === 'Post-Draft Fact Checker') postIn.push(src);
    });
  });
});

const preCon  = conn['Pre-Draft Fact Checker'];
const postCon = conn['Post-Draft Fact Checker'];
if (preCon?.main)  preCon.main.forEach(targets => (targets||[]).forEach(t => preOut.push(t.node)));
if (postCon?.main) postCon.main.forEach(targets => (targets||[]).forEach(t => postOut.push(t.node)));

console.log('Pre-Draft Fact Checker:');
console.log('  <-- from:', preIn);
console.log('  --> to:', preOut);
console.log('\nPost-Draft Fact Checker:');
console.log('  <-- from:', postIn);
console.log('  --> to:', postOut);

const devNames = new Set(dev.nodes.map(n => n.name));
const allRelated = [...new Set([...preIn, ...preOut, ...postIn, ...postOut])];
console.log('\nConnected nodes in DEV:');
allRelated.forEach(n => console.log('  ' + (devNames.has(n) ? 'YES' : ' NO') + ' | ' + n));
