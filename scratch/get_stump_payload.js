const https = require('https');
const fs    = require('fs');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const o = {
      hostname: 'seobrand.app.n8n.cloud', path, method: 'GET',
      headers: {
        'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM',
        'Accept': 'application/json'
      }
    };
    const req = https.request(o, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject); req.end();
  });
}

async function main() {
  const exec = await apiGet('/api/v1/executions/3004?includeData=true');
  const body = exec.data?.resultData?.runData?.['Webhook1']?.[0]?.data?.main?.[0]?.[0]?.json?.body;

  if (!body) { console.error('No webhook body found'); process.exit(1); }

  console.log('=== EXEC 3004 FULL WEBHOOK PAYLOAD ===');
  console.log(JSON.stringify(body, null, 2));
  fs.writeFileSync('scratch/exec3004_webhook_payload.json', JSON.stringify(body, null, 2), 'utf8');
  console.log('\nSaved to scratch/exec3004_webhook_payload.json');
  console.log('\nKey fields:');
  console.log('  title:', body.title || body.article_title);
  console.log('  client:', body.client_name);
  console.log('  request_id:', body.request_id);
  console.log('  run_id:', body.run_id);
  console.log('  word_count:', body.word_count);
  console.log('  primary_keywords type:', typeof body.primary_keywords, '| value:', JSON.stringify(body.primary_keywords)?.substring(0, 80));
  console.log('  secondary_keywords type:', typeof body.secondary_keywords);
  console.log('  all keys:', Object.keys(body).join(', '));
}
main().catch(console.error);
