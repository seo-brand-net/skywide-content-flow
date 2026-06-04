const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));

// 1. Get all valid node names
const validNodes = new Set(wf.nodes.map(n => n.name));
console.log('Total valid nodes:', validNodes.size);

// 2. Regex to find node references like $('Node Name') or $("Node Name")
const refRegex = /\$\(\s*['"]([^'"]+)['"]\s*\)/g;

let badRefs = 0;
const uniqueBadRefs = new Set();

// 3. Check every string parameter in every node
function checkParameters(nodeName, obj, path) {
    if (!obj) return;
    for (let key in obj) {
        if (typeof obj[key] === 'string') {
            const str = obj[key];
            let match;
            while ((match = refRegex.exec(str)) !== null) {
                const referencedNode = match[1];
                if (!validNodes.has(referencedNode)) {
                    console.log(`❌ INVALID REFERENCE in node '${nodeName}' (path: ${path}.${key}):`);
                    console.log(`   Referenced node: '${referencedNode}' (does not exist!)`);
                    console.log(`   Expression: ... ${str.substring(Math.max(0, match.index - 20), match.index + 40)} ...\n`);
                    badRefs++;
                    uniqueBadRefs.add(referencedNode);
                }
            }
        } else if (typeof obj[key] === 'object') {
            checkParameters(nodeName, obj[key], path + '.' + key);
        }
    }
}

wf.nodes.forEach(node => {
    checkParameters(node.name, node.parameters, 'parameters');
});

console.log('Total bad references found:', badRefs);
console.log('Missing nodes:', Array.from(uniqueBadRefs).join(', '));
