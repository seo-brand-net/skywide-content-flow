/**
 * retest_runs.js
 * 
 * Fetches recent content runs by Billy and a second team member from the DB,
 * then re-submits their creative briefs to the test workflow webhook.
 * Results will appear in the test_results table.
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://obswcosfipqjvklqlnrj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ';
const N8N_TEST_WEBHOOK = 'https://seobrand.app.n8n.cloud/webhook/content-engine-test-unique';

// Known user IDs (identified from DB query)
const BILLY_USER_ID   = 'ee379fc2-e0d4-47d2-b9cb-13cf5e5b88d9';
const SECOND_USER_ID  = '67024671-e8eb-45a1-83c2-f4b7037aa7a6';  // Ran PEO + New Hope Fertility

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ──────────────────────────────────────────────────────────────────
function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Retest Runner ===\n');

  // 1. Fetch 2 runs from Billy
  const { data: billyRuns, error: e1 } = await supabase
    .from('content_requests')
    .select('id, user_id, article_title, client_name, creative_brief, word_count, article_type, primary_keywords, secondary_keywords, tone')
    .eq('user_id', BILLY_USER_ID)
    .order('created_at', { ascending: false })
    .limit(2);

  if (e1) { console.error('Billy query error:', e1.message); return; }

  // 2. Fetch 2 runs from second user
  const { data: secondRuns, error: e2 } = await supabase
    .from('content_requests')
    .select('id, user_id, article_title, client_name, creative_brief, word_count, article_type, primary_keywords, secondary_keywords, tone')
    .eq('user_id', SECOND_USER_ID)
    .order('created_at', { ascending: false })
    .limit(2);

  if (e2) { console.error('Second user query error:', e2.message); return; }

  const allRuns = [
    ...billyRuns.map(r => ({ ...r, submittedBy: 'Billy' })),
    ...secondRuns.map(r => ({ ...r, submittedBy: 'Second User' })),
  ].filter(r => r.creative_brief); // must have a brief

  console.log(`Found ${allRuns.length} runs to retest:\n`);
  allRuns.forEach((r, i) => {
    console.log(`  [${i+1}] [${r.submittedBy}] ${r.article_title} | ${r.client_name}`);
    console.log(`       original_id: ${r.id}`);
  });

  // 3. Insert pending rows into test_results so we can track them
  console.log('\n── Inserting test_results rows ──');
  const testRows = allRuns.map(r => ({
    id: crypto.randomUUID(),
    user_id: r.user_id,
    status: 'pending',
    created_at: new Date().toISOString(),
  }));

  const { data: inserted, error: insErr } = await supabase
    .from('test_results')
    .insert(testRows)
    .select('id');

  if (insErr) {
    console.error('Insert error:', insErr.message);
    // Continue anyway — webhook will create its own row
  } else {
    console.log(`Inserted ${inserted.length} pending rows into test_results`);
    inserted.forEach((r, i) => console.log(`  test_result id: ${r.id} → run: ${allRuns[i]?.article_title}`));
  }

  // 4. Submit each brief to the test webhook
  console.log('\n── Firing test webhooks ──');
  for (let i = 0; i < allRuns.length; i++) {
    const run = allRuns[i];
    const testId = inserted?.[i]?.id || crypto.randomUUID();
    const requestId = crypto.randomUUID();

    const payload = {
      request_id:     requestId,
      run_id:         testId,
      request_status: 'test',
      creative_brief: run.creative_brief,
      title:          run.article_title,
      client_name:    run.client_name,
      article_type:   run.article_type   || 'Blogs',
      word_count:     run.word_count     || '900',
      primary_keyword: run.primary_keywords   || '',
      secondary_keywords: run.secondary_keywords || '',
      tone:           run.tone           || 'Professional',
      original_request_id: run.id,
    };

    console.log(`\n[${i+1}/${allRuns.length}] Submitting: "${run.article_title}" (${run.submittedBy})`);
    console.log(`  request_id: ${requestId}`);
    console.log(`  run_id:     ${testId}`);

    try {
      const res = await postJson(N8N_TEST_WEBHOOK, payload);
      console.log(`  ✅ Webhook response: ${res.status} — ${res.body.substring(0, 120)}`);
    } catch (err) {
      console.error(`  ❌ Webhook failed: ${err.message}`);
    }

    // Stagger submissions by 5 seconds to avoid rate limiting
    if (i < allRuns.length - 1) {
      console.log('  Waiting 5s before next submission...');
      await sleep(5000);
    }
  }

  console.log('\n=== All test submissions sent ===');
  console.log('Check the test_results table or /dashboard/test-export to see results as they come in.');
}

main().catch(console.error);
