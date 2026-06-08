const fs = require('fs');
const readline = require('readline');

const conversations = {
    '16c8a735-8afe-443e-b1a2-5045a7b3285c': 'Skywide Automation and CRM Integration',
    'ecdae4bc-10f1-4eb6-9bdd-a963136fee09': 'Wiring Skywide Testing Environment',
    '3f7f8cdc-1ebd-4e6b-88c5-79d823c177ad': 'Optimizing AI Content Pipeline',
    'd54fdbd2-e80a-452f-bc2d-b6a2af24cc0c': 'Fact-Checking ABA Therapy Claims'
};

const brainDir = 'C:\\Users\\USER\\.gemini\\antigravity\\brain';

async function processConversations() {
    let allEvents = [];

    for (const [id, title] of Object.entries(conversations)) {
        const transcriptPath = `${brainDir}\\${id}\\.system_generated\\logs\\transcript.jsonl`;
        if (!fs.existsSync(transcriptPath)) {
            console.log(`Missing transcript for ${title} (${id})`);
            continue;
        }

        const fileStream = fs.createReadStream(transcriptPath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let firstDate = null;
        for await (const line of rl) {
            try {
                const parsed = JSON.parse(line);
                
                // Get timestamp from ADDITIONAL_METADATA if available
                let dateStr = null;
                if (parsed.type === 'USER_INPUT' && parsed.content && parsed.content.includes('<ADDITIONAL_METADATA>')) {
                    const match = parsed.content.match(/The current local time is: ([^<]+)/);
                    if (match) dateStr = match[1].trim();
                }

                if (dateStr && !firstDate) firstDate = dateStr;

                if (parsed.type === 'USER_INPUT' && parsed.content) {
                    allEvents.push({
                        convo: title,
                        date: dateStr || firstDate || 'Unknown',
                        type: 'USER',
                        text: parsed.content.substring(0, 1000).replace(/\n/g, ' ')
                    });
                }
            } catch (e) {}
        }
    }

    // Sort by date roughly
    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    let report = '=== CROSS-CONVERSATION TIMELINE ===\n\n';
    allEvents.forEach(e => {
        report += `[${e.date}] ${e.convo} - USER: ${e.text}\n`;
    });

    fs.writeFileSync('scratch/cross_convo_timeline.txt', report);
    console.log('Saved cross-conversation timeline to scratch/cross_convo_timeline.txt');
}

processConversations().catch(console.error);
