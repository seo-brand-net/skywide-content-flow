const fs = require('fs');
const path = require('path');

const inputFilename = 'DEV_Skywide_Content_v3_QA_Final_Ready.json';
const outputFilename = 'DEV_Skywide_Content_v3_QA_Final_Ready_Organized.json';
const workingDir = 'c:\\Users\\A.hydar\\Documents\\production\\Skywide-project-main';

const inputPath = path.join(workingDir, inputFilename);
const outputPath = path.join(workingDir, outputFilename);

try {
    const workflowRaw = fs.readFileSync(inputPath, 'utf8');
    let workflow = JSON.parse(workflowRaw);
    if (Array.isArray(workflow)) workflow = workflow[0];

    // 1. Define the specific sequence nodes we want to place explicitly
    const sequence = [
        { name: 'QA Validator Code', x: 5700, y: 320 },
        { name: 'QA Check Passed?', x: 6000, y: 320 },
        { name: 'QA Rewriter Agent', x: 6000, y: 600 }, // Y offset for loop
        { name: 'FAQ Schema Generator', x: 6400, y: 320 },
        { name: 'Append FAQ to Article', x: 6800, y: 320 },
        { name: 'Document Export Sanitization3', x: 7200, y: 320 }
    ];

    const sequenceNames = sequence.map(s => s.name);

    // 2. Identify nodes that need shifting (Everything originally to the right of the insertion point)
    // The insertion point was around X=6400 originally. 
    // We want to shift everything that WAS > 6400 (excluding our sequence nodes if they were there)
    // Actually, safest way is: Anything that is NOT in our sequence list, and has X > 6400, shift it.
    // Wait, 'Document Export Sanitization3' was at 6412. It is in our sequence now.
    // '1st Scoring Agent' was at 6464. It is NOT in our sequence. It needs to move.

    // Let's set a cutoff X. Any node with X >= 6400 that is NOT in our explicit sequence map will be shifted.
    const cutoffX = 6400;
    const shiftAmount = 1200; // Moving them 1200px to the right to fit the new ~800px sequence + gaps

    workflow.nodes.forEach(node => {
        if (sequenceNames.includes(node.name)) {
            // This is one of our managed nodes, ignore for now (will set later)
            return;
        }

        if (node.position[0] >= cutoffX) {
            node.position[0] += shiftAmount;
        }
    });

    // 3. Place our active sequence nodes
    sequence.forEach(item => {
        const node = workflow.nodes.find(n => n.name === item.name);
        if (node) {
            node.position = [item.x, item.y];
        } else {
            console.warn(`Node not found during layout: ${item.name}`);
        }
    });

    // 4. Sanity check: Fix any overlaps in the shift zone? 
    // The simple shift should preserve relative structure of downstream nodes.

    // SAVE
    fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
    console.log(`Success! layout organized. Saved to ${outputPath}`);

} catch (err) {
    console.error(err);
}
