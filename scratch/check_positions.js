const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wf;
try {
  wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse:', e.message);
  process.exit(1);
}

console.log('Node positions:');
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let outliers = [];

wf.nodes.forEach(n => {
    if (n.position) {
        const [x, y] = n.position;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        
        // Let's define anything outside [-5000, 15000] as an outlier
        if (x < -5000 || x > 15000 || y < -5000 || y > 15000) {
            outliers.push(`${n.name}: [${x}, ${y}]`);
        }
    }
});

console.log(`Bounding Box: X[${minX}, ${maxX}] Y[${minY}, ${maxY}]`);
if (outliers.length > 0) {
    console.log('Outlier Nodes:');
    console.log(outliers.join('\n'));
} else {
    console.log('No extreme outliers found.');
}
