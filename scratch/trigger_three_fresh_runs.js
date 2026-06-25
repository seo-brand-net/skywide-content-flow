/**
 * Trigger 3 fresh article runs with completely new request_id + run_id UUIDs.
 *
 * Strategy:
 * 1. Attempt to create a new content_request via the Skywide API for each run
 * 2. If that endpoint doesn't exist / rejects, fall back to using the original
 *    request_id (which already has a DB record) with fresh run_ids.
 *
 * The payload is the same stump grinding article brief but with all IDs freshly generated.
 */

const https = require('https');
const fs    = require('fs');
const crypto = require('crypto');

// ─── Helpers ────────────────────────────────────────────────────────────────
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

// ─── Config ─────────────────────────────────────────────────────────────────
const N8N_WEBHOOK_HOST = 'seobrand.app.n8n.cloud';
const N8N_WEBHOOK_PATH = '/webhook/content-engine-dev';
const SKYWIDE_HOST     = 'skywide-content-flow.vercel.app';
// Existing DB-valid request_id (fallback)
const FALLBACK_REQUEST_ID = '8df8deda-afa2-41b4-9e9b-9c36d8a4bd80';

// ─── Base payload (same article, new IDs each time) ─────────────────────────
const basePayload = JSON.parse(
  fs.readFileSync('scratch/exec3004_webhook_payload.json', 'utf8')
);

// ─── Attempt to create a new content_request in Skywide DB ──────────────────
async function tryCreateContentRequest(requestId, runId, title) {
  // Try the Skywide content-flow API — if it has a create endpoint
  const result = await httpRequest({
    hostname: SKYWIDE_HOST,
    path: '/api/content-requests',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, {
    request_id:      requestId,
    run_id:          runId,
    title:           title,
    client_name:     basePayload.client_name,
    user_id:         basePayload.user_id,
    article_type:    basePayload.article_type,
    status:          'pending'
  });
  return result;
}

// ─── Fire a single run ───────────────────────────────────────────────────────
async function fireRun(runIndex) {
  const requestId = newUUID();
  const runId     = newUUID();
  const title     = `${basePayload.title} — Test Run ${runIndex + 1}`;

  console.log(`\n[Run ${runIndex + 1}] New request_id: ${requestId}`);
  console.log(`[Run ${runIndex + 1}] New run_id:     ${runId}`);

  // Try creating a new DB record first
  let useRequestId = requestId;
  try {
    const createResult = await tryCreateContentRequest(requestId, runId, title);
    if (createResult.status === 200 || createResult.status === 201) {
      console.log(`[Run ${runIndex + 1}] ✅ New content_request created in DB`);
    } else if (createResult.status === 404 || createResult.status === 405) {
      // Endpoint doesn't exist — fall back silently
      console.log(`[Run ${runIndex + 1}] ⚠️  API endpoint not found — using fallback request_id`);
      useRequestId = FALLBACK_REQUEST_ID;
    } else {
      console.log(`[Run ${runIndex + 1}] ⚠️  DB create returned ${createResult.status} — using fallback request_id`);
      console.log(`[Run ${runIndex + 1}]    Response:`, JSON.stringify(createResult.body).substring(0, 150));
      useRequestId = FALLBACK_REQUEST_ID;
    }
  } catch(e) {
    console.log(`[Run ${runIndex + 1}] ⚠️  Could not reach Skywide API (${e.message}) — using fallback request_id`);
    useRequestId = FALLBACK_REQUEST_ID;
  }

  // Build fresh payload
  const payload = {
    ...basePayload,
    title,
    request_id: useRequestId,
    run_id:     runId,
    timestamp:  new Date().toISOString(),
    // tag for identification
    _test_run_index: runIndex + 1
  };

  // Fire webhook
  const result = await httpRequest({
    hostname: N8N_WEBHOOK_HOST,
    path: N8N_WEBHOOK_PATH,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, payload);

  console.log(`[Run ${runIndex + 1}] Webhook → HTTP ${result.status}: ${JSON.stringify(result.body)}`);
  return { runIndex: runIndex + 1, requestId: useRequestId, runId, webhookStatus: result.status };
}

// ─── Check n8n for new executions shortly after firing ──────────────────────
async function getLatestExecIds() {
  return new Promise((resolve, reject) => {
    const o = {
      hostname: 'seobrand.app.n8n.cloud',
      path: '/api/v1/executions?workflowId=t3LNiuZIghvobde3&limit=10',
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjRjMzEyZC04MDE1LTQxMjYtODdjMS0wOTcwZDc3YzdjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc1NzMyNzEzfQ.4U_FC3A6bQpajQqIZ0CUNDDL9ikKfRWx0db5EXqPXsM',
        'Accept': 'application/json'
      }
    };
    const req = https.request(o, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject); req.end();
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== FIRING 3 FRESH ARTICLE TEST RUNS ===');
  console.log('Each run gets new request_id + run_id UUIDs');
  console.log('Firing sequentially with 3s gap to avoid race conditions...\n');

  const results = [];

  for (let i = 0; i < 3; i++) {
    const r = await fireRun(i);
    results.push(r);
    if (i < 2) {
      console.log('  Waiting 3s before next run...');
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  console.log('\n=== WAITING 8s THEN CHECKING N8N EXECUTIONS ===');
  await new Promise(res => setTimeout(res, 8000));

  const execList = await getLatestExecIds();
  const execs = execList.data || [];
  console.log('\nLatest n8n executions:');
  execs.slice(0, 6).forEach(e => {
    console.log(`  ID: ${e.id} | Status: ${e.status} | Started: ${e.startedAt}`);
  });

  // Save results
  const summary = {
    firedAt: new Date().toISOString(),
    runs: results,
    executions: execs.slice(0, 6).map(e => ({ id: e.id, status: e.status, startedAt: e.startedAt }))
  };
  fs.writeFileSync('scratch/three_run_test_summary.json', JSON.stringify(summary, null, 2));
  console.log('\nSummary saved to scratch/three_run_test_summary.json');
  console.log('\nExecution IDs to monitor:');
  execs.slice(0, 3).forEach(e => console.log(`  ${e.id} → ${e.status}`));
}

main().catch(console.error);
