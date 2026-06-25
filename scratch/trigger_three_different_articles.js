const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = https.request(options, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function newUUID() { return crypto.randomUUID(); }

const N8N_WEBHOOK_HOST = 'seobrand.app.n8n.cloud';
const N8N_WEBHOOK_PATH = '/webhook/content-engine-dev';

async function main() {
  console.log('=== FIRING 3 DIFFERENT ARTICLE TEST RUNS ===');
  console.log('Using completely new request_id and run_id UUIDs for each.\\n');

  const articles = JSON.parse(fs.readFileSync('scratch/three_distinct_articles.json', 'utf8'));
  
  if (articles.length < 3) {
    console.error('Not enough articles found in three_distinct_articles.json!');
    return;
  }

  const results = [];

  for (let i = 0; i < 3; i++) {
    const basePayload = articles[i];
    const requestId = newUUID();
    const runId = newUUID();
    const title = `${basePayload.title} — Fact-Check Test ${i + 1}`;

    console.log(`[Run ${i + 1}] Client: ${basePayload.client_name}`);
    console.log(`[Run ${i + 1}] Title:  ${basePayload.title}`);
    console.log(`[Run ${i + 1}] New request_id: ${requestId}`);
    console.log(`[Run ${i + 1}] New run_id:     ${runId}`);

    const payload = {
      ...basePayload,
      title,
      request_id: requestId,
      run_id: runId,
      timestamp: new Date().toISOString()
    };

    const result = await httpRequest({
      hostname: N8N_WEBHOOK_HOST,
      path: N8N_WEBHOOK_PATH,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    }, payload);

    console.log(`[Run ${i + 1}] Webhook → HTTP ${result.status}: ${JSON.stringify(result.body)}\n`);
    results.push({ runIndex: i + 1, requestId, runId, webhookStatus: result.status });
    
    if (i < 2) {
      console.log('Waiting 3s before next run...\n');
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  fs.writeFileSync('scratch/three_different_runs_summary.json', JSON.stringify(results, null, 2));
  console.log('Summary saved to scratch/three_different_runs_summary.json');
}

main().catch(console.error);
