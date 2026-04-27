const fs = require('fs');

const filePath = 'DEV Skywide  Content.json';

const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

if (data.nodes) {
    data.nodes.forEach(node => {
        if (node.parameters && node.parameters.messages && node.parameters.messages.values) {
            node.parameters.messages.values.forEach(val => {
                if (val.content) {
                    val.content = val.content.replace(
                        /\$\('Keyword Strategist'\)\.item\.json/g,
                        "$('Keyword Strategist').first().json"
                    );
                }
            });
        }
    });
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
console.log('Replaced .item.json with .first().json for Keyword Strategist references.');
