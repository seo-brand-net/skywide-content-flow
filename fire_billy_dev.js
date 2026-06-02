/**
 * fire_billy_dev.js
 * Sends Billy's last content request to the live DEV webhook.
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const https = require('https');

const SUPABASE_URL  = 'https://obswcosfipqjvklqlnrj.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ';
const DEV_WEBHOOK   = 'https://seobrand.app.n8n.cloud/webhook/content-engine-dev';
const BILLY_USER_ID = 'ee379fc2-e0d4-47d2-b9cb-13cf5e5b88d9';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

async function main() {
  console.log('=== Sending Billy\'s last request to DEV ===\n');

  // Fetch Billy's most recent content request
  const { data, error } = await supabase
    .from('content_requests')
    .select('*')
    .eq('user_id', BILLY_USER_ID)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) { console.error('Fetch error:', error.message); return; }

  console.log('Article:', data.article_title || data.title);
  console.log('Client: ', data.client_name);
  console.log('Created:', data.created_at);
  console.log('ID:     ', data.id);

  // Build payload — same shape as production form submissions
  const runId = crypto.randomUUID();
  const payload = {
    run_id:             runId,                 // required by DEV webhook
    request_id:         data.id,
    request_status:     'production',          // not 'test' — goes to live pipeline
    creative_brief:     data.creative_brief,
    title:              data.article_title || data.title,
    client_name:        data.client_name,
      client_website_url: data.client_website_url || null,
    article_type:       data.article_type       || 'Blogs',
    word_count:         data.word_count         || '900',
    primary_keyword:    data.primary_keywords   || '',
    secondary_keywords: data.secondary_keywords || '',
    tone:               data.tone               || 'Professional',
    page_intent:        data.page_intent        || '',
    audience:           data.audience           || '',
    semantic_theme:     data.semantic_themes    || '',
  };
  console.log('run_id:', runId);

  console.log('\nFiring to DEV webhook:', DEV_WEBHOOK);
  const res = await postJson(DEV_WEBHOOK, payload);
  console.log('Response:', res.status, res.body.substring(0, 120));

  if (res.status === 200) {
    console.log('\n✅ Submitted successfully. The DEV workflow is now running.');
    console.log('Check the n8n execution log or the content_requests table for output.');
  } else {
    console.log('\n❌ Unexpected response — check if the DEV webhook is active in n8n.');
  }
}

main().catch(console.error);
