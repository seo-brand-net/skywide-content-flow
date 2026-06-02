/**
 * pull_test_results.js
 * Fetches the latest completed content runs for the 3 test clients
 * and prints the raw_content for comparison analysis.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://obswcosfipqjvklqlnrj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_CLIENTS = ['Sacred Connection', 'PDH Pro', 'The Ridge RTC'];

async function main() {
  const fs = require('fs');
  const results = [];

  for (const clientName of TARGET_CLIENTS) {
    // Get the content request
    const { data: req, error: reqErr } = await supabase
      .from('content_requests')
      .select('id, article_title, client_name, current_run_id, updated_at')
      .ilike('client_name', `%${clientName}%`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (reqErr || !req) {
      console.log(`[${clientName}] Not found: ${reqErr?.message}`);
      continue;
    }

    // Get the latest run
    const { data: run, error: runErr } = await supabase
      .from('content_runs')
      .select('id, status, raw_content, n8n_execution_id, created_at')
      .eq('content_request_id', req.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (runErr || !run) {
      console.log(`[${clientName}] No run found: ${runErr?.message}`);
      continue;
    }

    console.log(`\n[${req.client_name}] "${req.article_title}"`);
    console.log(`  Run status:    ${run.status}`);
    console.log(`  Run ID:        ${run.id}`);
    console.log(`  Created:       ${run.created_at}`);
    console.log(`  Content chars: ${run.raw_content ? run.raw_content.length : 'NONE'}`);

    results.push({
      client: req.client_name,
      title: req.article_title,
      status: run.status,
      content: run.raw_content || null
    });
  }

  // Save full content to files for analysis
  results.forEach(r => {
    if (r.content) {
      const fname = `test_output_${r.client.replace(/\s+/g, '_')}.txt`;
      fs.writeFileSync(fname, r.content, 'utf8');
      console.log(`\nSaved: ${fname}`);
    } else {
      console.log(`\n[${r.client}] No content yet — run may still be processing.`);
    }
  });
}

main().catch(console.error);
