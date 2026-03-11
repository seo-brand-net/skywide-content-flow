const fs = require('fs');
const d = JSON.parse(fs.readFileSync('DEV Skywide  Content (TEST v23).json', 'utf8'));

const targets = ['FAQ Schema Generator', 'FAQ Schema Generator1', 'FAQ Schema Generator2', 'FAQ Schema Generator3',
    'Append FAQ to Article', 'Append FAQ to Article1', 'Append FAQ to Article2', 'Append FAQ to Article3'];

for (const [srcNode, conns] of Object.entries(d.connections)) {
    if (conns.main) {
        conns.main.forEach(arr => {
            arr.forEach(target => {
                if (targets.includes(target.node)) {
                    console.log(srcNode + ' connects to ' + target.node);
                }
            });
        });
    }
}
