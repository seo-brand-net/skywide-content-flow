const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

const parserNode = 'Parse Creative Brief (LLM)';
if (wf.connections[parserNode]) {
    let connections = wf.connections[parserNode].main[0];
    
    // Filter out the connection to 'Pre-Draft Fact Checker'
    const newConnections = connections.filter(c => c.node !== 'Pre-Draft Fact Checker');
    
    if (newConnections.length < connections.length) {
        wf.connections[parserNode].main[0] = newConnections;
        fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
        console.log('Successfully removed the rogue parallel connection from Parse Creative Brief to Pre-Draft Fact Checker.');
    } else {
        console.log('Connection not found.');
    }
}
