const fs = require('fs');
const dev = JSON.parse(fs.readFileSync('DEV Skywide Content.json', 'utf8'));

console.log('--- ALL MODEL REFERENCES IN WORKFLOW ---\n');
dev.nodes.forEach(n => {
    const params = JSON.stringify(n.parameters || {});
    // Pull out any model field values
    const modelField = n.parameters && n.parameters.model;
    const modelInParams = params.match(/"model"\s*:\s*"([^"]+)"/g) || [];
    
    if (modelField || modelInParams.length > 0) {
        console.log('Node: [' + n.type + '] ' + n.name);
        if (modelField) console.log('  model param: ' + modelField);
        modelInParams.forEach(m => console.log('  ' + m));
        console.log('');
    }
});
