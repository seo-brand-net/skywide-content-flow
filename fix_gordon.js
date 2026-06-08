const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixGordon() {
  const { data, error } = await supabase
    .from('indexing_clients')
    .update({ last_run_at: null })
    .ilike('name', '%Gordon%')
    .select();

  console.log('Fixed Gordon Clients:', error || data);
}

fixGordon();
