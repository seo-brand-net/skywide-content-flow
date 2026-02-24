const fs = require('fs');
const FILE = 'DEV Skywide  Content (TEST v23).json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// Route Webhook1 exclusively to Keyword Strategist
data.connections['Webhook1'] = {
    main: [
        [
            { node: 'Keyword Strategist', type: 'main', index: 0 }
        ]
    ]
};

// Route Keyword Strategist to Execution Data1
data.connections['Keyword Strategist'] = {
    main: [
        [
            { node: 'Execution Data1', type: 'main', index: 0 }
        ]
    ]
};

// Fix the UI positioning slightly so they don't overlap too badly
const wNode = data.nodes.find(n => n.name === 'Webhook1');
const ksNode = data.nodes.find(n => n.name === 'Keyword Strategist');
const edNode = data.nodes.find(n => n.name === 'Execution Data1');

if (wNode && ksNode && edNode) {
    // Put Keyword Strategist between Webhook and Execution Data1
    ksNode.position = [
        wNode.position[0] + 200,
        wNode.position[1]
    ];
    edNode.position = [
        ksNode.position[0] + 200,
        wNode.position[1]
    ];
    // Shift all subsequent nodes a bit if needed, but the user can auto-format in the UI.
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Successfully rewired Keyword Strategist into the main execution path!');
