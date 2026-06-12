const fs = require('fs');

const wfPath = 'DEV Skywide Content.json';
let wfStr = fs.readFileSync(wfPath, 'utf8');

// Replace the broken syntax with modern syntax that includes .isExecuted checks to prevent crashing when skipped
wfStr = wfStr.replace(
    /\{\{\s*\$node\["Claims Extractor & Manifest Generator"\]\.json\.approved_claims\s*\}\}/g,
    "{{ $('Claims Extractor & Manifest Generator').isExecuted ? $('Claims Extractor & Manifest Generator').first().json.approved_claims : '[]' }}"
);

wfStr = wfStr.replace(
    /\{\{\s*\$node\["Claims Extractor & Manifest Generator"\]\.json\.approved_statistics\s*\}\}/g,
    "{{ $('Claims Extractor & Manifest Generator').isExecuted ? $('Claims Extractor & Manifest Generator').first().json.approved_statistics : '[]' }}"
);

fs.writeFileSync(wfPath, wfStr);
console.log('Successfully updated Claims Extractor syntax across the workflow.');
