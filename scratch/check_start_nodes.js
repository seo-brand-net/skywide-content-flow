const fs = require('fs');

const wfPath = 'DEV Skywide Content (Word Count Fix).json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const startingNodes = wf.nodes.filter(n => {
    let hasIncoming = false;
    for (const [source, targets] of Object.entries(wf.connections)) {
        for (const port in targets) {
            targets[port].forEach(arr => {
                arr.forEach(c => {
                    if (c.node === n.name) hasIncoming = true;
                });
            });
        }
    }
    return !hasIncoming;
});

console.log('Starting nodes in the workflow:');
startingNodes.forEach(n => {
    console.log(`- ${n.name} (${n.type})`);
});

const webhookNode = wf.nodes.find(n => n.name === 'Webhook1' || n.name.toLowerCase().includes('webhook'));
if (webhookNode) {
    console.log('\nWebhook Configuration:');
    console.log(JSON.stringify(webhookNode, null, 2));
}
