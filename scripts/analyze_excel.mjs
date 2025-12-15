import XLSX from 'xlsx';
import fs from 'fs';

const FILE_PATH = 'Projec-Quote-Tool.xlsx';


try {
    console.log(`Reading file (buffer): ${FILE_PATH}`);
    const buf = fs.readFileSync(FILE_PATH);
    console.log('Parsing headers (first N rows)...');

    // Read only first 50 rows to get structure/headers/formulas without parsing huge dataset
    const workbook = XLSX.read(buf, { type: 'buffer', sheetRows: 50, cellFormula: true });

    console.log('--- Workbook Analysis ---');
    console.log(`Sheets in workbook: ${workbook.SheetNames.join(', ')}`);

    workbook.SheetNames.forEach(name => {
        console.log(`\n--- Sheet: ${name} ---`);
        const sheet = workbook.Sheets[name];

        // Get dimensions
        const range = XLSX.utils.decode_range(sheet['!ref']);
        console.log(`Dimensions: ${range.e.r + 1} rows, ${range.e.c + 1} columns`);

        // Print first 5 rows to understand structure
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0 }); // Array of arrays
        const preview = data.slice(0, 5);

        console.log('Preview (First 5 Rows):');
        console.log(JSON.stringify(preview, null, 2));

        // Sample some formulas if they exist
        // Iterate specifically to find cells with .f property
        let formulaCount = 0;
        const sampleFormulas = [];

        Object.keys(sheet).forEach(key => {
            if (key.startsWith('!')) return;
            if (sheet[key].f) {
                formulaCount++;
                if (sampleFormulas.length < 5) {
                    sampleFormulas.push(`${key}: =${sheet[key].f}`);
                }
            }
        });

        if (formulaCount > 0) {
            console.log(`Found ${formulaCount} formulas. Samples:`);
            console.log(sampleFormulas.join('\n'));
        } else {
            console.log('No formulas detected.');
        }
    });

} catch (error) {
    console.error('Error analyzing Excel file:', error.message);
}
