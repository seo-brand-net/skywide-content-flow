const fs = require('fs');
const FILE = 'DEV Skywide  Content (TEST v23).json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

console.log('\\nExecution Data1 Connections:');
console.dir(data.connections['Execution Data1'], { depth: null });
