const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function investigate2() {
  // 1. Get Gordon & SEO Brand client IDs
  const { data: clients } = await supabase
    .from('indexing_clients')
    .select('id, name, last_run_at')
    .or('name.ilike.%Gordon%,name.ilike.%SEO Brand%');

  console.log('\n=== GORDON & SEO BRAND CLIENT RECORDS ===');
  console.log(JSON.stringify(clients, null, 2));

  const clientIds = clients.map(c => c.id);

  // 2. ALL runs ever for these two clients (no date filter — see the full history)
  const { data: allRuns, error } = await supabase
    .from('indexing_runs')
    .select('id, indexing_client_id, triggered_by, status, created_at, completed_at, error_message, google_summary, bing_summary')
    .in('indexing_client_id', clientIds)
    .order('created_at', { ascending: false });

  console.log('\n=== ALL RUNS FOR GORDON & SEO BRAND ===');
  console.log(JSON.stringify(error || allRuns, null, 2));

  // 3. Check if there are ANY runs at all between Jun 10-15 (all clients)
  const { data: windowRuns, error: windowErr } = await supabase
    .from('indexing_runs')
    .select('id, indexing_client_id, triggered_by, status, created_at, error_message')
    .gte('created_at', '2026-06-10T00:00:00Z')
    .lte('created_at', '2026-06-15T23:59:59Z')
    .order('created_at', { ascending: true });

  console.log('\n=== ALL RUNS Jun 10–15 (all clients) ===');
  console.log(JSON.stringify(windowErr || windowRuns, null, 2));

  // 4. Count total runs in DB
  const { count } = await supabase
    .from('indexing_runs')
    .select('*', { count: 'exact', head: true });

  console.log('\n=== TOTAL RUNS IN DB ===', count);
}

investigate2();
