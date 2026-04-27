const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('TEST Skywide  Content.json', 'utf8'));
const raw = JSON.stringify(wf);

const wh = wf.nodes.find(n => n.name === 'Webhook1');
console.log('Webhook path:', wh.parameters.path);

const devCount = (raw.match(/content-engine-dev/g) || []).length;
console.log('Remaining content-engine-dev occurrences:', devCount, devCount === 0 ? 'PASS' : 'FAIL');

const httpNodes = wf.nodes.filter(n => n.type.includes('httpRequest'));
httpNodes.forEach(n => {
  const url = n.parameters && n.parameters.url ? n.parameters.url : '(no url)';
  console.log(n.name, '->', url);
});

const n8nHookCount = (raw.match(/\/api\/webhooks\/n8n-/g) || []).length;
console.log('Remaining n8n-* webhook URLs:', n8nHookCount, n8nHookCount === 0 ? 'PASS' : 'FAIL');

console.log('Workflow name:', wf.name);
console.log('Active:', wf.active);
console.log('Pin data keys:', Object.keys(wf.pinData || {}).length);
