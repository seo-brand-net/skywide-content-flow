import XLSX from 'xlsx';
import fs from 'fs';

const FILE_PATH = 'Projec-Quote-Tool.xlsx';
const OUTPUT_PATH = 'excel_full_data.json';

try {
    console.log(`Reading file (buffer): ${FILE_PATH}`);
    const buf = fs.readFileSync(FILE_PATH);

    // Read the entire file without row limits
    // parsing logic might take a bit of time
    const workbook = XLSX.read(buf, { type: 'buffer', cellFormula: false, cellHTML: false });

    const fullData = {
        metadata: {
            fileName: FILE_PATH,
            generatedAt: new Date().toISOString(),
            sheetCount: workbook.SheetNames.length
        },
        sheets: {}
    };

import zlib from 'zlib';

    console.log('Converting sheets to JSON (cleaning empty rows)...');
    workbook.SheetNames.forEach(name => {
        console.log(`Processing sheet: ${name}`);
        const sheet = workbook.Sheets[name];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        
        // "Compress" by removing completely empty rows which bloat Excel exports
        const cleanData = rawData.filter(row => row.some(cell => cell !== null && cell !== ''));
        
        if (cleanData.length > 0) {
            fullData.sheets[name] = cleanData;
        } else {
            console.log(`Skipping empty sheet: ${name}`);
        }
    });

    console.log(`Writing compressed JSON to ${OUTPUT_PATH}.gz ...`);
    // Gzip the JSON string
    const jsonStr = JSON.stringify(fullData);
    const compressed = zlib.gzipSync(jsonStr);
    fs.writeFileSync(`${OUTPUT_PATH}.gz`, compressed);
    
    console.log(`Done! Original size: ${(jsonStr.length/1024/1024).toFixed(2)} MB. Compressed: ${(compressed.length/1024/1024).toFixed(2)} MB.`);

} catch (error) {
    console.error('Error extracting full JSON:', error.message);
    if (error.message.includes('heap')) {
        console.error('Core dump/OOM detected. The file is too large for the current memory limit.');
    }
}
