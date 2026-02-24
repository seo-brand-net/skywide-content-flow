const fs = require('fs');
const path = require('path');

const FILE = 'DEV Skywide  Content (TEST v23).json';
const filePath = path.join(__dirname, FILE);

console.log('Reading workflow file...');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let updated = false;

const preservationRule = `
### BRIEF STRUCTURE PRESERVATION
You MUST NOT alter the structural formatting (tables, lists, specific H2s/H3s) present in the original article. Maintain the exact heading hierarchy and rich formatting elements, as these align with the creative brief's explicit requests.`;

data.nodes.forEach((n, idx) => {
    let p = n.parameters;
    let changed = false;

    // Function to inject rule
    const inject = (content) => {
        if (content && content.includes('KEYWORD PRESERVATION') && !content.includes('BRIEF STRUCTURE PRESERVATION')) {
            return content + '\n' + preservationRule;
        }
        return content;
    };

    if (p.messages && p.messages.values && p.messages.values.length > 0) {
        let oldContent = p.messages.values[0].content;
        let newContent = inject(oldContent);
        if (oldContent !== newContent) {
            p.messages.values[0].content = newContent;
            changed = true;
        }
    } else if (p.systemMessage) {
        let oldContent = p.systemMessage;
        let newContent = inject(oldContent);
        if (oldContent !== newContent) {
            p.systemMessage = newContent;
            changed = true;
        }
    }

    if (changed) {
        updated = true;
        console.log(`✅ Updated ${n.name} with structure preservation`);
    }
});

if (updated) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('\\n✅ Done! File saved.');
} else {
    console.log('No refining nodes needed updating.');
}
