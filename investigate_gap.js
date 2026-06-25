const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function investigate() {
  const from = '2026-06-09T00:00:00Z';
  const to   = '2026-06-16T00:00:00Z';

  // 1. All runs in the date window (any client)
  const { data: allRuns, error: allRunsErr } = await supabase
    .from('indexing_runs')
    .select('id, indexing_client_id, triggered_by, status, created_at, completed_at, error_message, google_summary, bing_summary')
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: true });

  console.log('\n=== ALL RUNS Jun 9–16 ===');
  console.log(JSON.stringify(allRunsErr || allRuns, null, 2));

  // 2. Gordon & Partners client record
  const { data: gordon, error: gordonErr } = await supabase
    .from('indexing_clients')
    .select('*')
    .ilike('name', '%Gordon%');

  console.log('\n=== GORDON CLIENT RECORD ===');
  console.log(JSON.stringify(gordonErr || gordon, null, 2));

  // 3. SEO Brand client record
  const { data: seo, error: seoErr } = await supabase
    .from('indexing_clients')
    .select('*')
    .ilike('name', '%SEO Brand%');

  console.log('\n=== SEO BRAND CLIENT RECORD ===');
  console.log(JSON.stringify(seoErr || seo, null, 2));

  // 4. All Gordon runs ever
  if (gordon && gordon.length > 0) {
    const { data: gordonRuns, error: gordonRunsErr } = await supabase
      .from('indexing_runs')
      .select('id, triggered_by, status, created_at, error_message, google_summary')
      .eq('indexing_client_id', gordon[0].id)
      .order('created_at', { ascending: false })
      .limit(20);
    console.log('\n=== GORDON RECENT RUNS (last 20) ===');
    console.log(JSON.stringify(gordonRunsErr || gordonRuns, null, 2));
  }

  // 5. All SEO Brand runs ever
  if (seo && seo.length > 0) {
    const { data: seoRuns, error: seoRunsErr } = await supabase
      .from('indexing_runs')
      .select('id, triggered_by, status, created_at, error_message, google_summary')
      .eq('indexing_client_id', seo[0].id)
      .order('created_at', { ascending: false })
      .limit(20);
    console.log('\n=== SEO BRAND RECENT RUNS (last 20) ===');
    console.log(JSON.stringify(seoRunsErr || seoRuns, null, 2));
  }

  // 6. last_run_at on all clients — check who has a recent stamp
  const { data: allClients, error: allClientsErr } = await supabase
    .from('indexing_clients')
    .select('name, is_active, last_run_at')
    .order('last_run_at', { ascending: false });

  console.log('\n=== ALL INDEXING CLIENTS (last_run_at) ===');
  console.log(JSON.stringify(allClientsErr || allClients, null, 2));
}

investigate();
