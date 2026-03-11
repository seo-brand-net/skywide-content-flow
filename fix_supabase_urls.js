const fs = require('fs');
const FILE = 'PROD Skywide Content v23.json';
const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const badUrl = 'https://obswcosfipqjvkqlfnrj.supabase.co';
const goodUrl = 'https://obswcosfipqjvklqlnrj.supabase.co';

let updated = 0;

d.nodes.forEach(n => {
    let strNode = JSON.stringify(n);
    if (strNode.includes(badUrl)) {
        strNode = strNode.split(badUrl).join(goodUrl);
        Object.assign(n, JSON.parse(strNode));
        updated++;
        console.log(`✅ Fixed URL in node: ${n.name}`);
    }
});

if (updated > 0) {
    fs.writeFileSync(FILE, JSON.stringify(d, null, 2), 'utf8');
    console.log(`\\n✅ Fixed ${updated} nodes and saved file.`);
} else {
    console.log('No incorrect URLs found.');
}
