/**
 * resend_dev_batch.js
 *
 * Fetches the last 2 requests from Billy and the last 2 from Natalie,
 * generates a fresh run_id for each, and submits them to the live DEV webhook.
 * This triggers the n8n-start webhook, adding a new row to content_runs
 * and setting the request status to 'in_progress' so it's visible in the UI.
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL    = 'https://obswcosfipqjvklqlnrj.supabase.co';
const SUPABASE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ';
const DEV_WEBHOOK     = 'https://seobrand.app.n8n.cloud/webhook/content-engine-dev';

const BILLY_USER_ID   = 'ee379fc2-e0d4-47d2-b9cb-13cf5e5b88d9';
const NATALIE_USER_ID = '67024671-e8eb-45a1-83c2-f4b7037aa7a6';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

const SELECT_FIELDS = 'id, user_id, article_title, client_name, creative_brief, word_count, article_type, primary_keywords, secondary_keywords, tone, page_intent, title_audience, semantic_themes, created_at';

async function main() {
  console.log('=== Batch DEV Resend: Billy (2) + Natalie (2) ===\n');

  const { data: billyRuns, error: e1 } = await supabase
    .from('content_requests')
    .select(SELECT_FIELDS)
    .eq('user_id', BILLY_USER_ID)
    .order('created_at', { ascending: false })
    .limit(2);

  if (e1) { console.error('Billy query error:', e1.message); return; }

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

  console.log(`Found ${allRuns.length} run(s) to send to DEV pipeline:\n`);
  
  for (let i = 0; i < allRuns.length; i++) {
    const run = allRuns[i];
    const runId = crypto.randomUUID(); // Fresh run ID for the new execution
    const articleTitle = run.article_title || run.title || 'Untitled';

    const payload = {
      run_id:             runId,
      request_id:         run.id,
      request_status:     'production',          // Must be production for DEV webhook
      creative_brief:     run.creative_brief,
      title:              articleTitle,
      client_name:        run.client_name,
      article_type:       run.article_type       || 'Blogs',
      word_count:         run.word_count         || '900',
      primary_keyword:    run.primary_keywords   || '',
      secondary_keywords: run.secondary_keywords || '',
      tone:               run.tone               || 'Professional',
      page_intent:        run.page_intent        || '',
      audience:           run.title_audience     || '',
      semantic_theme:     run.semantic_themes    || '',
    };

    console.log(`[${i+1}/${allRuns.length}] "${articleTitle}" (${run.submittedBy})`);
    console.log(`  request_id: ${run.id}`);
    console.log(`  new run_id: ${runId}`);

    try {
      const res = await postJson(DEV_WEBHOOK, payload);
      console.log(`  ✅ ${res.status} — ${res.body.substring(0, 100)}`);
    } catch (err) {
      console.error(`  ❌ Webhook failed: ${err.message}`);
    }

    if (i < allRuns.length - 1) {
      console.log('  Waiting 5s...');
      await sleep(5000);
    }
  }

  console.log('\n=== All submissions sent to DEV ===');
  console.log('You can track their status in the Skywide Content Dashboard.');
}

main().catch(console.error);
