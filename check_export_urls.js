const fs = require('fs');
const d = JSON.parse(fs.readFileSync('PROD Skywide Content v23.json', 'utf8'));

d.nodes.forEach(n => {
    if (n.name.includes('Google Drive') || n.name.includes('Database') || n.name.includes('Notification')) {
        console.log(`--- ${n.name} ---`);
        if (n.parameters && n.parameters.url) {
            console.log('URL:', n.parameters.url);
        }
    }
});
