require('dotenv').config();
const fs = require('fs');
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';
const WORKFLOW_ID = 't3LNiuZIghvobde3';

async function updateMaxTokens() {
    const wf = JSON.parse(fs.readFileSync('scratch/workflow_max_tokens_fixed.json', 'utf8'));
    
    // Create a clean payload with only allowed properties for update
    const payload = {
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings,
        meta: wf.meta,
        versionId: wf.versionId
    };
    
    // Push back to n8n
    const pushRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
        method: 'PUT',
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!pushRes.ok) {
        console.error('Failed to update workflow on n8n:', await pushRes.text());
    } else {
        console.log('Successfully pushed updated workflow to n8n!');
    }
}

updateMaxTokens().catch(console.error);
