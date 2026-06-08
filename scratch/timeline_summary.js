const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\16c8a735-8afe-443e-b1a2-5045a7b3285c\\.system_generated\\logs\\transcript.jsonl';

async function extractTimeline() {
    const fileStream = fs.createReadStream(transcriptPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let timeline = [];
    let currentStep = null;

    for await (const line of rl) {
        try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'USER_INPUT' && parsed.content) {
                timeline.push({
                    type: 'USER',
                    content: parsed.content.substring(0, 500).replace(/\n/g, ' '),
                    step: parsed.step_index
                });
            } else if (parsed.type === 'MODEL_RESPONSE' || parsed.type === 'PLANNER_RESPONSE') {
                if (parsed.content) {
                    timeline.push({
                        type: 'AI',
                        content: parsed.content.substring(0, 500).replace(/\n/g, ' '),
                        step: parsed.step_index
                    });
                }
            }
        } catch (e) {}
    }

    let report = '=== TIMELINE OF OPTIMIZATIONS ===\n\n';
    timeline.forEach(item => {
        report += `[Step ${item.step}] ${item.type}: ${item.content}\n`;
    });

    fs.writeFileSync('scratch/timeline_summary.txt', report);
    console.log('Timeline saved to scratch/timeline_summary.txt');
}

extractTimeline().catch(console.error);
