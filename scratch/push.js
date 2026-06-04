const fs = require('fs');
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';
const WORKFLOW_ID = 't3LNiuZIghvobde3';

async function push() {
    const wf = JSON.parse(fs.readFileSync('DEV Skywide Content (Word Count Fix).json', 'utf8'));
    const res = await fetch(N8N_BASE_URL + '/api/v1/workflows/' + WORKFLOW_ID, {
        method: 'PUT',
        headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings || {},
            staticData: wf.staticData || null
        })
    });
    if (res.ok) {
        console.log('✅ Workflow pushed to n8n successfully');
    } else {
        const err = await res.json();
        console.error('❌ Push failed:', JSON.stringify(err, null, 2));
    }
}
push().catch(console.error);
