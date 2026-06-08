const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkGordon() {
  const { data: clients, error: clientsError } = await supabase
    .from('indexing_clients')
    .select('*')
    .ilike('name', '%Gordon%');

  console.log('Indexing Clients:', clientsError || clients);

  if (clients && clients.length > 0) {
    const { data: runs, error: runsError } = await supabase
      .from('indexing_runs')
      .select('*')
      .eq('indexing_client_id', clients[0].id)
      .order('created_at', { ascending: false })
      .limit(5);
    console.log('Recent Runs for Gordon:', runsError || runs);
  }
}

checkGordon();
