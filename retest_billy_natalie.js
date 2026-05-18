/**
 * retest_billy_natalie.js
 *
 * Fetches the last 1 request from Billy and the last 2 from Natalie,
 * submits them to the TEST workflow webhook, and ensures each gets
 * a pending row in test_results for tracking in /dashboard/test-export.
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL    = 'https://obswcosfipqjvklqlnrj.supabase.co';
const SUPABASE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ';
const N8N_TEST_WEBHOOK = 'https://seobrand.app.n8n.cloud/webhook/content-engine-test-unique';

const BILLY_USER_ID   = 'ee379fc2-e0d4-47d2-b9cb-13cf5e5b88d9';
const NATALIE_USER_ID = '67024671-e8eb-45a1-83c2-f4b7037aa7a6';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const SELECT_FIELDS = 'id, user_id, article_title, client_name, creative_brief, word_count, article_type, primary_keywords, secondary_keywords, tone, created_at';

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Retest: Billy (1) + Natalie (2) ===\n');

  // 1. Fetch last 1 from Billy
  const { data: billyRuns, error: e1 } = await supabase
    .from('content_requests')
    .select(SELECT_FIELDS)
    .eq('user_id', BILLY_USER_ID)
    .order('created_at', { ascending: false })
    .limit(1);

  if (e1) { console.error('Billy query error:', e1.message); return; }

  // 2. Fetch last 2 from Natalie
  const { data: natalieRuns, error: e2 } = await supabase
    .from('content_requests')
    .select(SELECT_FIELDS)
    .eq('user_id', NATALIE_USER_ID)
    .order('created_at', { ascending: false })
    .limit(2);

  if (e2) { console.error('Natalie query error:', e2.message); return; }

  const allRuns = [
    ...billyRuns.map(r  => ({ ...r, submittedBy: 'Billy'   })),
    ...natalieRuns.map(r => ({ ...r, submittedBy: 'Natalie' })),
  ].filter(r => r.creative_brief);

  if (!allRuns.length) {
    console.error('No runs with creative briefs found. Exiting.');
    return;
  }

  console.log(`Found ${allRuns.length} run(s) to retest:\n`);
  allRuns.forEach((r, i) => {
    console.log(`  [${i+1}] [${r.submittedBy}] "${r.article_title}" | ${r.client_name}`);
    console.log(`        original_id: ${r.id}`);
    console.log(`        submitted:   ${r.created_at}`);
  });

  // 3. Build runs with pre-assigned request_ids, then pre-insert into test_results
  // The request_id must be set BEFORE firing the webhook so the test-callback
  // API (which does UPDATE WHERE request_id = ?) can find the row.
  const runsWithIds = allRuns.map(r => ({
    ...r,
    requestId: crypto.randomUUID(),   // this goes into BOTH the DB row AND the webhook payload
    rowId:     crypto.randomUUID(),   // PK for the test_results row
  }));

  console.log('\n── Pre-inserting pending rows into test_results ──');
  const testRows = runsWithIds.map(r => ({
    id:            r.rowId,
    request_id:    r.requestId,           // must match what the workflow sends back
    user_id:       r.user_id,
    article_title: r.article_title,
    status:        'pending',
    path_id:       'content-engine-test-unique',
    created_at:    new Date().toISOString(),
  }));

  const { data: inserted, error: insErr } = await supabase
    .from('test_results')
    .insert(testRows)
    .select('id, request_id');

  if (insErr) {
    console.error('❌ Pre-insert failed:', insErr.message);
    console.error('   Cannot continue — the test-callback API needs this row to exist first.');
    return;
  }

  console.log(`✅ Inserted ${inserted.length} pending row(s):`);
  inserted.forEach((r, i) =>
    console.log(`   row_id: ${r.id} | request_id: ${r.request_id} → "${runsWithIds[i]?.article_title}"`)
  );

  // 4. Fire webhooks using the same request_ids already in the DB
  console.log('\n── Submitting to TEST webhook ──');
  for (let i = 0; i < runsWithIds.length; i++) {
    const run = runsWithIds[i];

    const payload = {
      request_id:          run.requestId,          // matches the pre-inserted row
      run_id:              run.rowId,
      request_status:      'test',
      creative_brief:      run.creative_brief,
      title:               run.article_title,
      client_name:         run.client_name,
      article_type:        run.article_type        || 'Blogs',
      word_count:          run.word_count          || '900',
      primary_keyword:     run.primary_keywords    || '',
      secondary_keywords:  run.secondary_keywords  || '',
      tone:                run.tone                || 'Professional',
      original_request_id: run.id,
      submitted_by:        run.submittedBy,
    };

    console.log(`\n[${i+1}/${runsWithIds.length}] "${run.article_title}" (${run.submittedBy})`);
    console.log(`  request_id: ${run.requestId}`);
    console.log(`  row_id:     ${run.rowId}`);

    try {
      const res = await postJson(N8N_TEST_WEBHOOK, payload);
      console.log(`  ✅ ${res.status} — ${res.body.substring(0, 100)}`);
    } catch (err) {
      console.error(`  ❌ Webhook failed: ${err.message}`);
    }

    if (i < runsWithIds.length - 1) {
      console.log('  Waiting 5s...');
      await sleep(5000);
    }
  }

  console.log('\n=== All submissions sent ===');
  console.log('Results will appear in /dashboard/test-export as each workflow completes.');
}

main().catch(console.error);
