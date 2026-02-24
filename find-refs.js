const fs = require('fs');
const FILE = 'DEV Skywide  Content (TEST v23).json';
const data = fs.readFileSync(FILE, 'utf8');

const matches = data.match(/\\{\\{[^}]*Keyword Strategist[^}]*\\}\\}/g);
if (matches) {
    console.log('Found ' + matches.length + ' matches:');
    matches.forEach(m => console.log(m));
} else {
    console.log('No matches found');
}
