const fs = require('fs');

// 1. Update workflow webhook path
const wf = JSON.parse(fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8'));
const wh = wf.nodes.find(n => n.name === 'Webhook1');
wh.parameters.path = 'content-engine-test-unique';
fs.writeFileSync('TEST Skywide Content (Prompt Review).json', JSON.stringify(wf, null, 2), 'utf8');
console.log('Workflow webhook path:', wh.parameters.path);

// 2. Update .env
let env = fs.readFileSync('.env', 'utf8');
env = env.replace(
  /N8N_TEST_WEBHOOK_URL=.*/,
  'N8N_TEST_WEBHOOK_URL=https://seobrand.app.n8n.cloud/webhook/content-engine-test-unique'
);
fs.writeFileSync('.env', env, 'utf8');

// Verify
const newLine = env.split('\n').find(l => l.includes('N8N_TEST_WEBHOOK_URL'));
console.log('ENV updated:', newLine.trim());
