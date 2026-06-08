require('dotenv').config();
const fs = require('fs');
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';
const WORKFLOW_ID = 't3LNiuZIghvobde3';

async function updateMaxTokens() {
    console.log(`Fetching workflow ${WORKFLOW_ID}...`);
    const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    if (!res.ok) {
        console.error('Failed to fetch workflow:', await res.text());
        return;
    }
    
    const wf = await res.json();
    let updatedCount = 0;
    
    for (const node of wf.nodes) {
        // We want to target the Claude / Anthropic model nodes.
        // In LangChain n8n setups, max_tokens is often set on the Model node, not the Chain node.
        if (node.type === '@n8n/n8n-nodes-langchain.lmChatAnthropic') {
            console.log(`Found Anthropic Model Node: ${node.name}`);
            
            // The maxTokens property is usually under parameters.options.maxTokens
            if (!node.parameters) node.parameters = {};
            if (!node.parameters.options) node.parameters.options = {};
            
            const currentMax = node.parameters.options.maxTokens;
            console.log(`  Current maxTokens: ${currentMax}`);
            
            // Set to 4096 (a safe max for Claude 3 output tokens in most APIs, though Opus supports 4096 and Sonnet 3.5 supports 8192, 4096 is standard)
            node.parameters.options.maxTokens = 4096;
            updatedCount++;
            console.log(`  Updated to 4096.`);
        }
    }
    
    fs.writeFileSync('scratch/workflow_max_tokens_fixed.json', JSON.stringify(wf, null, 2));
    console.log(`\nUpdated ${updatedCount} Anthropic model nodes. Saved to scratch/workflow_max_tokens_fixed.json`);
    
    // Push back to n8n
    const pushRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
        method: 'PUT',
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(wf)
    });
    
    if (!pushRes.ok) {
        console.error('Failed to update workflow on n8n:', await pushRes.text());
    } else {
        console.log('Successfully pushed updated workflow to n8n!');
    }
}

updateMaxTokens().catch(console.error);
