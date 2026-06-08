const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:\\Users\\USER\\.gemini\\antigravity\\brain';

async function scanConversations() {
    const dirs = fs.readdirSync(brainDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== 'tempmediaStorage' && d.name !== 'scratch')
        .map(d => d.name);

    console.log(`Found ${dirs.length} conversation directories.\n`);

    for (const dir of dirs) {
        const transcriptPath = path.join(brainDir, dir, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(transcriptPath)) continue;

        let firstUserMessage = '';
        let hasContentEngine = false;
        let hasOptimization = false;
        let hasWiring = false;
        let lineCount = 0;

        const fileStream = fs.createReadStream(transcriptPath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        for await (const line of rl) {
            lineCount++;
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'USER_INPUT' && parsed.content) {
                    const text = parsed.content.toLowerCase();
                    if (!firstUserMessage) {
                        firstUserMessage = parsed.content.substring(0, 100).replace(/\n/g, ' ');
                    }
                    if (text.includes('skywide content engine')) hasContentEngine = true;
                    if (text.includes('optimization')) hasOptimization = true;
                    if (text.includes('wiring skywide testing enviroment') || text.includes('wiring skywide')) hasWiring = true;
                }
            } catch (e) {
                // ignore parse errors
            }
        }

        if (hasContentEngine || hasOptimization || hasWiring) {
            console.log(`=== Conversation ID: ${dir} ===`);
            console.log(`Lines: ${lineCount}`);
            console.log(`Has 'Wiring Skywide': ${hasWiring}`);
            console.log(`Has 'Content Engine': ${hasContentEngine}`);
            console.log(`First user message: ${firstUserMessage}`);
            console.log('');
        }
    }
}

scanConversations().catch(console.error);
