const fs = require('fs');
const file = 'DEV Skywide Content (Word Count Fix).json';
let wf = JSON.parse(fs.readFileSync(file, 'utf8'));

let modified = false;

// Helper to replace .item. with .first(). in a string and ensure it starts with = if it has {{
function fixString(str) {
    if (typeof str !== 'string') return str;
    let newStr = str;
    
    // Replace .item. with .first().
    if (newStr.includes('.item.')) {
        newStr = newStr.replace(/\.item\./g, '.first().');
    }
    
    // Ensure expression mode if it starts with {{ or contains complex expressions
    if (newStr.trim().startsWith('{{') && !newStr.trim().startsWith('=')) {
        newStr = '=' + newStr;
    }
    
    return newStr;
}

// Traverse the parameters object to fix strings
function traverse(obj) {
    if (!obj) return;
    for (let key in obj) {
        if (typeof obj[key] === 'string') {
            const fixed = fixString(obj[key]);
            if (fixed !== obj[key]) {
                obj[key] = fixed;
                modified = true;
            }
        } else if (typeof obj[key] === 'object') {
            traverse(obj[key]);
        }
    }
}

// List of nodes to check based on the error
const targetNodes = [
    'Data Check & Research Gaps1', 
    'OpenAI Keyword Check + Semantic Gap1', 
    'Claude Keyword Check + Semantic Gap1', 
    'Keyword Strategist'
];

wf.nodes.forEach(node => {
    if (targetNodes.includes(node.name) || node.type.includes('langchain')) {
        traverse(node.parameters);
    }
});

if (modified) {
    fs.writeFileSync(file, JSON.stringify(wf, null, 2));
    console.log('Fixed .item. and expression issues in workflow JSON.');
} else {
    console.log('No issues found to fix.');
}
