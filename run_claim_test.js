/**
 * run_claim_test.js
 *
 * Fetches the 3 content requests that had claim issues (from the Google Doc),
 * injects verified client website URLs, and fires them through the DEV webhook
 * using the exact same payload structure as the dashboard form.
 */
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL     = 'https://obswcosfipqjvklqlnrj.supabase.co';
const SUPABASE_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ';

// ← Correct DEV webhook (same as what the content request form uses)
const N8N_WEBHOOK = 'https://seobrand.app.n8n.cloud/webhook/content-engine-dev';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Verified client URLs from web search
const TARGET_CLIENTS = [
  { name: 'Sacred Connection', url: 'https://sacredconnection.co'   },
  { name: 'PDH Pro',           url: 'https://pdh-pro.com'           },
  { name: 'The Ridge RTC',     url: 'https://www.theridgertc.com'   },
];

const SELECT = 'id, user_id, article_title, title_audience, client_name, client_website_url, creative_brief, word_count, article_type, primary_keywords, secondary_keywords, semantic_themes, tone, page_intent, created_at';

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
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
  console.log('=== Claim Issue Test — 3 Clients → DEV webhook ===\n');

  const runs = [];

  for (const client of TARGET_CLIENTS) {
    const { data, error } = await supabase
      .from('content_requests')
      .select(SELECT)
      .ilike('client_name', `%${client.name}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      console.log(`[${client.name}] Not found or error: ${error?.message}`);
      continue;
    }

    runs.push({ ...data[0], verifiedUrl: client.url });
    console.log(`✅ [${data[0].client_name}] "${data[0].article_title}"`);
    console.log(`   Using URL: ${client.url}`);
  }

  if (!runs.length) {
    console.error('\nNo matching requests found. Exiting.');
    return;
  }

  console.log(`\n── Firing ${runs.length} requests to ${N8N_WEBHOOK} ──\n`);

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];

    // Use the ORIGINAL DB request ID so content_runs FK constraint is satisfied.
    // Generate a fresh run_id for this specific test execution.
    const requestId = run.id;            // ← real row in content_requests
    const runId     = crypto.randomUUID(); // ← fresh run for this test

    // ── Exact same payload shape as dashboard/page.tsx lines 141-157 ──────
    const payload = {
      title:              run.article_title,
      audience:           run.title_audience         || '',
      client_name:        run.client_name,
      client_website_url: run.verifiedUrl,
      creative_brief:     run.creative_brief,
      article_type:       run.article_type           || 'Blogs',
      word_count:         String(run.word_count      || 900),
      primary_keywords:   Array.isArray(run.primary_keywords)
                            ? run.primary_keywords[0]
                            : (run.primary_keywords  || ''),
      secondary_keywords: Array.isArray(run.secondary_keywords)
                            ? run.secondary_keywords.join(', ')
                            : (run.secondary_keywords || ''),
      semantic_theme:     Array.isArray(run.semantic_themes)
                            ? run.semantic_themes.join(', ')
                            : (run.semantic_themes   || ''),
      tone:               run.tone                   || 'Professional',
      page_intent:        run.page_intent            || '',
      request_id:         requestId,
      run_id:             runId,
      user_id:            run.user_id,
      timestamp:          new Date().toISOString(),
    };

    console.log(`[${i+1}/${runs.length}] "${run.article_title}"`);
    console.log(`  client_name:        ${payload.client_name}`);
    console.log(`  client_website_url: ${payload.client_website_url}`);
    console.log(`  request_id:         ${requestId}`);

    try {
      const res = await postJson(N8N_WEBHOOK, payload);
      console.log(`  ✅ Webhook: HTTP ${res.status} — ${res.body.substring(0, 80)}`);
    } catch (err) {
      console.error(`  ❌ Webhook failed: ${err.message}`);
    }

    if (i < runs.length - 1) {
      console.log('  Waiting 5s...\n');
      await sleep(5000);
    }
  }

  console.log('\n=== All submissions sent ===');
  console.log('Check the n8n DEV workflow executions and compare output against the Google Doc.');
}

main().catch(console.error);
