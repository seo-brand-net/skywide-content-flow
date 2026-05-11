/**
 * retest_specific.js
 * Re-submits the two articles that had remaining issues after the first run:
 * 1. Spearmint Tea (total testosterone overclaim)
 * 2. SMM Panel (unverified promotional statistics)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = 'https://obswcosfipqjvklqlnrj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ';
const N8N_TEST_WEBHOOK = 'https://seobrand.app.n8n.cloud/webhook/content-engine-test-unique';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Original request IDs from the first run
const TARGET_IDS = [
  '20730ff7-a8dc-4805-b2c7-2944205a87d8', // Spearmint Tea (Billy / New Hope Fertility)
  '8a391e4c-72bb-4346-b8f2-5f156e4c4a98', // SMM Panel (Boostero)
];

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
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

async function main() {
  console.log('=== Targeted Re-Test (Post Prompt Fix) ===\n');

  const { data, error } = await supabase
    .from('content_requests')
    .select('id, user_id, article_title, client_name, creative_brief, word_count, article_type, primary_keywords, secondary_keywords, tone')
    .in('id', TARGET_IDS);

  if (error) { console.error('DB error:', error.message); return; }

  console.log(`Found ${data.length} runs to re-test:\n`);
  data.forEach((r, i) => console.log(`  [${i+1}] ${r.article_title} | ${r.client_name}`));

  console.log('\n── Firing webhooks ──');
  for (let i = 0; i < data.length; i++) {
    const run = data[i];
    const requestId = crypto.randomUUID();
    const runId = crypto.randomUUID();

    const payload = {
      request_id:         requestId,
      run_id:             runId,
      request_status:     'test',
      creative_brief:     run.creative_brief,
      title:              run.article_title,
      client_name:        run.client_name,
      article_type:       run.article_type || 'Blogs',
      word_count:         run.word_count || '900',
      primary_keyword:    run.primary_keywords || '',
      secondary_keywords: run.secondary_keywords || '',
      tone:               run.tone || 'Professional',
      original_request_id: run.id,
      retest_reason:      i === 0 ? 'Total testosterone overclaim fix' : 'Promotional statistics removal fix',
    };

    console.log(`\n[${i+1}/${data.length}] Submitting: "${run.article_title}"`);
    console.log(`  Reason: ${payload.retest_reason}`);
    console.log(`  request_id: ${requestId}`);

    try {
      const res = await postJson(N8N_TEST_WEBHOOK, payload);
      console.log(`  ✅ Response: ${res.status} — ${res.body.substring(0, 80)}`);
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
    }

    if (i < data.length - 1) {
      console.log('  Waiting 5s...');
      await sleep(5000);
    }
  }

  console.log('\n=== Re-test submissions sent ===');
  console.log('Check /dashboard/test-export for the new results.');
}

main().catch(console.error);
