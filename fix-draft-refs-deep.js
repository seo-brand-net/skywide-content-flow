const fs = require('fs');
const FILE = 'DEV Skywide  Content (TEST v23).json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let updated = false;

data.nodes.forEach(n => {
    if (n.parameters) {
        let p = n.parameters;

        // Recursive replace function
        const fixString = (str) => {
            if (typeof str === 'string' && str.includes("$('Keyword Strategist').item.json.structure_prompt_injection")) {
                return str.replace(
                    /\\$\\('Keyword Strategist'\\)\\.item\\.json\\.structure_prompt_injection/g,
                    "$('Keyword Strategist').first().json.structure_prompt_injection"
                );
            }
            return str;
        };

        const traverse = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    let newStr = fixString(obj[key]);
                    if (newStr !== obj[key]) {
                        obj[key] = newStr;
                        updated = true;
                        console.log("✅ Fixed reference in " + n.name + " (property: " + key + ")");
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    traverse(obj[key]);
                }
            }
        };

        traverse(p);
    }
});

if (updated) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Done!');
} else {
    console.log('No fixes needed in parameters object');
}
