/**
 * Resubmit article #1 (Seawall Repair - FSS) as a fresh request
 * with a new Supabase row + correct webhook payload.
 * The Claims Extractor fix is now live, so this run will produce
 * a proper verified_claims manifest.
 */
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabase = createClient(
  'https://obswcosfipqjvklqlnrj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ'
);

// Webhook URL from .env N8N_CONTENT_ENGINE_WEBHOOK_URL
const WEBHOOK_URL = 'https://seobrand.app.n8n.cloud/webhook/content-engine-dev';

function postWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log('Webhook HTTP status:', res.statusCode);
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  // ── 1. Pull the original record ───────────────────────────────────────────
  console.log('Fetching original article record...');
  const { data: original, error: fetchErr } = await supabase
    .from('content_requests')
    .select('*')
    .eq('id', 'ec230e9a-644f-4d2a-a1f5-acd4635810ee')
    .single();

  if (fetchErr) { console.error('Supabase fetch error:', fetchErr.message); process.exit(1); }
  console.log('Original article:', original.article_title);

  // ── 2. Create a fresh Supabase row (new request_id) ───────────────────────
  console.log('\nCreating new content_request row...');
  const newRow = {
    user_id:           original.user_id,
    article_title:     original.article_title,
    title_audience:    original.title_audience,
    seo_keywords:      original.seo_keywords || '',
    article_type:      original.article_type,
    client_name:       original.client_name,
    client_website_url: 'https://www.floridaseawallsolutions.com', // adding URL that was missing on original
    creative_brief:    original.creative_brief,
    status:            'pending',
    webhook_sent:      false,
    primary_keywords:  original.primary_keywords,
    secondary_keywords: original.secondary_keywords,
    semantic_themes:   original.semantic_themes,
    tone:              original.tone,
    word_count:        original.word_count,
    page_intent:       original.page_intent,
    improvement_notes: 'RERUN: Claims Extractor fix applied 2026-06-24. Previous run (ec230e9a) had broken data binding — verified_claims was null. This rerun validates the fix and produces a clean, fact-checked article.'
  };

  const { data: newRecord, error: insertErr } = await supabase
    .from('content_requests')
    .insert(newRow)
    .select()
    .single();

  if (insertErr) { console.error('Supabase insert error:', insertErr.message); process.exit(1); }
  console.log('New request created:', newRecord.id);

  // ── 3. Fire the webhook ───────────────────────────────────────────────────
  const webhookPayload = {
    request_id:        newRecord.id,
    run_id:            newRecord.id,
    is_revision:       false,

    // Content fields
    title:             newRecord.article_title,
    client_name:       newRecord.client_name,
    client_website_url: newRecord.client_website_url,
    creative_brief:    newRecord.creative_brief,
    article_type:      newRecord.article_type,
    page_intent:       newRecord.page_intent,
    word_count:        newRecord.word_count,
    tone:              newRecord.tone,
    title_audience:    newRecord.title_audience,

    // Keyword fields: Keyword Validator/Strategist nodes call .trim() + .split(',')
    // so these must be comma-separated strings, not arrays
    primary_keywords:  Array.isArray(newRecord.primary_keywords)
                         ? newRecord.primary_keywords.join(', ')
                         : (newRecord.primary_keywords || ''),
    secondary_keywords: Array.isArray(newRecord.secondary_keywords)
                         ? newRecord.secondary_keywords.join(', ')
                         : (newRecord.secondary_keywords || ''),
    semantic_themes:   Array.isArray(newRecord.semantic_themes)
                         ? newRecord.semantic_themes.join(', ')
                         : (newRecord.semantic_themes || '')
  };

  console.log('\nFiring webhook...');
  console.log('Payload request_id:', webhookPayload.request_id);
  console.log('Payload title:', webhookPayload.title);
  console.log('Payload client_website_url:', webhookPayload.client_website_url);
  console.log('creative_brief length:', webhookPayload.creative_brief?.length, 'chars');

  const result = await postWebhook(WEBHOOK_URL, webhookPayload);

  console.log('\nWebhook response status:', result.status);
  console.log('Webhook response body:', JSON.stringify(result.body).substring(0, 300));

  if (result.status === 200 || result.status === 202) {
    // Mark as webhook_sent in Supabase
    const { error: updateErr } = await supabase
      .from('content_requests')
      .update({ webhook_sent: true, status: 'processing' })
      .eq('id', newRecord.id);

    if (updateErr) {
      console.warn('Warning: Could not mark webhook_sent:', updateErr.message);
    } else {
      console.log('\nRow updated to webhook_sent=true, status=processing');
    }

    console.log('\n✅ SUCCESS');
    console.log('New request ID:', newRecord.id);
    console.log('Track in Supabase: content_requests where id =', newRecord.id);
    console.log('Watch for n8n execution to complete (~18-22 min based on previous runs)');
  } else {
    console.error('\n❌ Webhook did not return 2xx. Check n8n workflow is active.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
