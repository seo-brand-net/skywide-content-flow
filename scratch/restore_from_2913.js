const fs = require('fs');
const https = require('https');
const env = fs.readFileSync('.env', 'utf8');

const apiKey = env.match(/N8N_API_KEY=([^\r\n]+)/)[1].trim().replace(/^["']|["']$/g, '');
const base = env.match(/N8N_BASE_URL=([^\r\n]+)/)[1].trim().replace(/\/$/, '').replace(/^["']|["']$/g, '');

function n8nGet(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(base + path);
        const req = https.request({
            hostname: url.hostname, path: url.pathname + url.search, method: 'GET',
            headers: { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json' }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.end();
    });
}

async function run() {
    console.log("Fetching Execution 2913 workflow data...");
    const ex = await n8nGet('/api/v1/executions/2913?includeData=true');
    const nodes = ex.data.workflowData.nodes;
    
    const sourceExtractor = nodes.find(n => n.name === 'Claims Extractor & Manifest Generator');
    const sourceParser = nodes.find(n => n.name === 'Claims Extractor Output Parser');
    
    if (!sourceExtractor || !sourceParser) {
        console.error("Could not find nodes in 2913 workflow data.");
        return;
    }
    
    const wfPath = 'DEV Skywide Content (Word Count Fix).json';
    let targetWf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
    
    const targetExtractorIdx = targetWf.nodes.findIndex(n => n.name === 'Claims Extractor & Manifest Generator');
    const targetParserIdx = targetWf.nodes.findIndex(n => n.name === 'Claims Extractor Output Parser');
    
    // Copy the exact parameters and types, but keep the current position so it doesn't jump to the corner
    if (targetExtractorIdx !== -1) {
        targetWf.nodes[targetExtractorIdx].parameters = sourceExtractor.parameters;
        targetWf.nodes[targetExtractorIdx].type = sourceExtractor.type;
        console.log("Replaced Claims Extractor & Manifest Generator parameters from 2913");
    }
    
    if (targetParserIdx !== -1) {
        targetWf.nodes[targetParserIdx].parameters = sourceParser.parameters;
        targetWf.nodes[targetParserIdx].type = sourceParser.type;
        console.log("Replaced Claims Extractor Output Parser parameters from 2913");
    }
    
    fs.writeFileSync(wfPath, JSON.stringify(targetWf, null, 2));
    console.log("Successfully restored nodes to EXACTLY match Execution 2913!");
}
run();
