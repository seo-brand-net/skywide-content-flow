const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const testLine = env.split('\n').find(l => l.includes('N8N_TEST_WEBHOOK_URL')) || '';
console.log('ENV line:', testLine.trim());

const wf = JSON.parse(fs.readFileSync('TEST Skywide Content (Prompt Review).json', 'utf8'));
const wh = wf.nodes.find(n => n.name === 'Webhook1');
console.log('Workflow webhook path:', wh.parameters.path);

// Parse the path out of the URL
const m = testLine.match(/webhook\/([^\s"']+)/);
const envPath = m ? m[1] : 'NOT FOUND';
console.log('ENV webhook path:', envPath);
console.log('');
if (envPath === wh.parameters.path) {
  console.log('MATCH - dashboard will reach workflow');
} else {
  console.log('MISMATCH - needs fixing');
  console.log('  ENV expects:     ' + envPath);
  console.log('  Workflow has:    ' + wh.parameters.path);
}
