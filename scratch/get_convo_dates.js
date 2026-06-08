const fs = require('fs');
const readline = require('readline');
const path = require('path');

const ids = {
    'ecdae4bc-10f1-4eb6-9bdd-a963136fee09': 'Wiring Skywide Testing Environment',
    '3f7f8cdc-1ebd-4e6b-88c5-79d823c177ad': 'Optimizing AI Content Pipeline',
    'd54fdbd2-e80a-452f-bc2d-b6a2af24cc0c': 'Fact-Checking ABA Therapy Claims'
};

const brainDir = 'C:\\Users\\USER\\.gemini\\antigravity\\brain';

async function scanDates() {
    let output = '';
    for (const [id, title] of Object.entries(ids)) {
        const tPath = path.join(brainDir, id, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(tPath)) {
            output += `Missing: ${title} (${id})\n`;
            continue;
        }

        const fileStream = fs.createReadStream(tPath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let firstDate = null;
        let lastDate = null;
        let lineCount = 0;

        for await (const line of rl) {
            lineCount++;
            try {
                const parsed = JSON.parse(line);
                let dateStr = null;
                if (parsed.content && typeof parsed.content === 'string' && parsed.content.includes('<ADDITIONAL_METADATA>')) {
                    const match = parsed.content.match(/The current local time is: ([^<]+)/);
                    if (match) dateStr = match[1].trim();
                }
                
                // fallback if missing metadata
                if (!dateStr && parsed.timestamp) dateStr = parsed.timestamp;

                if (dateStr) {
                    if (!firstDate) firstDate = dateStr;
                    lastDate = dateStr;
                }
            } catch (e) {}
        }
        
        output += `Found: ${title}\n  - First Date: ${firstDate}\n  - Last Date: ${lastDate}\n  - Lines: ${lineCount}\n\n`;
    }
    
    fs.writeFileSync('scratch/convo_dates.txt', output);
    console.log('Saved dates to scratch/convo_dates.txt');
}

scanDates().catch(console.error);
