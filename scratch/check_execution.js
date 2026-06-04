const fs = require('fs');
const article = fs.readFileSync('scratch/latest_article.md', 'utf8');

const words = article.replace(/[#*_-]/g, '').split(/\s+/).filter(w => w.length > 0);
console.log('Final Article Word Count:', words.length);

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const N8N_BASE_URL = 'https://seobrand.app.n8n.cloud';

async function checkLoop() {
    const res = await fetch(N8N_BASE_URL + '/api/v1/executions/2781?includeData=true', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    }).then(r => r.json());
    
    const runData = res.data?.resultData?.runData || {};
    
    const maxIters = runData['Max Iterations1'] ? runData['Max Iterations1'].length : 0;
    console.log('Loop Executions (Max Iterations1 ran X times):', maxIters);
    
    const webhook = runData['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body || {};
    console.log('Target Word Count:', webhook.word_count);
    
    const aiAgent = runData['AI Agent1'];
    if (aiAgent) {
        console.log('\nAI Agent1 (QA Checker) ran', aiAgent.length, 'times:');
        aiAgent.forEach((iter, i) => {
            const out = iter.data?.main?.[0]?.[0]?.json || {};
            const passed = out.output?.passed || out.passed;
            const issues = out.output?.validation_issues || out.validation_issues;
            console.log(`  Iteration ${i+1}:`);
            console.log(`    Passed: ${passed}`);
            if (issues) console.log(`    Issues: ${issues}`);
        });
    }
}
checkLoop().catch(console.error);
