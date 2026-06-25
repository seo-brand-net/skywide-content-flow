const https = require('https');
const fs = require('fs');
const path = require('path');

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM';
const WORKFLOW_ID = 't3LNiuZIghvobde3';

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'seobrand.app.n8n.cloud',
      path,
      method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json',
        ...(bodyStr ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr)
        } : {})
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('HTTP', method, path, '->', res.statusCode);
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  // Load the saved workflow JSON (already fetched)
  const wf = JSON.parse(fs.readFileSync(path.join(__dirname, 'actual_prod_workflow.json'), 'utf8'));

  // Save backup
  fs.writeFileSync(path.join(__dirname, 'actual_prod_workflow.BACKUP.json'), JSON.stringify(wf, null, 2));
  console.log('Backup saved to scratch/actual_prod_workflow.BACKUP.json');

  // Find the Claims Extractor & Manifest Generator node
  const claimsNode = wf.nodes.find(n => n.name === 'Claims Extractor & Manifest Generator');
  if (!claimsNode) {
    console.error('ERROR: Could not find Claims Extractor & Manifest Generator node!');
    process.exit(1);
  }

  console.log('\nCurrent (broken) prompt references:');
  const currentPrompt = claimsNode.parameters.text;
  const briefRef = currentPrompt.match(/\{\{[^}]*brief[^}]*\}\}/g);
  const websiteRef = currentPrompt.match(/\{\{[^}]*website[^}]*\}\}/g);
  console.log('  $json.brief references:', briefRef);
  console.log('  $json.website_text references:', websiteRef);

  // THE FIX:
  // OLD: {{ $json.brief }} and {{ $json.website_text }}
  //   - $json.brief doesn't exist - node only gets Client Profile Extractor output
  //   - $json.website_text doesn't exist either
  //
  // NEW:
  //   - Brief comes from the webhook payload: $('Webhook1').first().json.body.creative_brief
  //   - Client profile comes from upstream node: $('Client Profile Extractor').first().json.message.content
  //
  // The n8n chainLlm node's text field uses = prefix for expressions and {{ }} for template vars

  const fixedPrompt = [
    '=# The Claims Bouncer',
    '',
    'You are a strict Claims Extractor for a content generation pipeline. Your job is to read the Creative Brief and the Client Website Data, and extract a strict allowlist of claims, statistics, and rules into a JSON Manifest.',
    '',
    '## Inputs',
    '**Creative Brief:**',
    "{{ $('Webhook1').first().json.body.creative_brief }}",
    '',
    '**Verified Client Profile (from website research):**',
    "{{ $('Client Profile Extractor').first().json.message.content }}",
    '',
    '## Rules',
    '1. Extract every specific service offering, product feature, and factual claim requested in the Brief.',
    "2. Verify each claim against the Verified Client Profile. If the client website does not support the claim, omit it or mark its source strictly as 'Brief'.",
    "3. Extract all statistics (e.g., '73% of people...').",
    '4. Generate a `forbidden_patterns` list containing typical AI hallucinated authority phrases you want the downstream nodes to avoid (e.g., \'practitioners consistently see\', \'American Psychological Association\', \'clinical experience shows\').',
    '',
    'Output STRICTLY in the provided JSON schema.'
  ].join('\n');

  claimsNode.parameters.text = fixedPrompt;

  console.log('\nFixed prompt references:');
  const newBriefRef = fixedPrompt.match(/\{\{[^}]*\}\}/g);
  console.log('  Template expressions:', newBriefRef);

  // Push the fix back to n8n
  console.log('\nPushing fix to n8n...');
  const patchBody = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
    staticData: wf.staticData || null
  };

  // n8n API uses PUT not PATCH for workflow updates
  let result = await apiRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, patchBody);
  if (result && result.message && result.message.includes('not allowed')) {
    console.log('PUT failed, trying POST...');
    result = await apiRequest('POST', `/api/v1/workflows/${WORKFLOW_ID}`, patchBody);
  }

  if (result && result.id) {
    console.log('\nSUCCESS!');
    console.log('Workflow updated:', result.id, '-', result.name);
    console.log('Updated at:', result.updatedAt);
    fs.writeFileSync(path.join(__dirname, 'actual_prod_workflow_patched.json'), JSON.stringify(result, null, 2));
    console.log('Patched workflow saved to scratch/actual_prod_workflow_patched.json');

    // Verify the fix is in place
    const verifyWf = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    const verifyNode = verifyWf.nodes && verifyWf.nodes.find(n => n.name === 'Claims Extractor & Manifest Generator');
    if (verifyNode) {
      const hasWebhookRef = verifyNode.parameters.text.includes("Webhook1");
      const hasProfileRef = verifyNode.parameters.text.includes("Client Profile Extractor");
      const hasOldBriefRef = verifyNode.parameters.text.includes('$json.brief');
      const hasOldWebsiteRef = verifyNode.parameters.text.includes('$json.website_text');
      console.log('\nVerification:');
      console.log('  Has Webhook1 reference:', hasWebhookRef ? 'YES' : 'NO');
      console.log('  Has Client Profile Extractor reference:', hasProfileRef ? 'YES' : 'NO');
      console.log('  Still has broken $json.brief:', hasOldBriefRef ? 'YES (PROBLEM!)' : 'NO - clean');
      console.log('  Still has broken $json.website_text:', hasOldWebsiteRef ? 'YES (PROBLEM!)' : 'NO - clean');
    }
  } else {
    console.error('\nFAILED. Response:', JSON.stringify(result).substring(0, 500));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
