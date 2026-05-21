const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: clients, error: clientErr } = await supabase
    .from('gbp_clients')
    .select('id, name')
    .eq('name', 'Suncoast Skin Solutions')
    .single();

  if (clientErr || !clients) {
    console.error('Failed to find Suncoast:', clientErr);
    return;
  }

  const { data: locations, error: locErr } = await supabase
    .from('gbp_locations')
    .select('id, location_name')
    .eq('gbp_client_id', clients.id);

  if (locErr) {
    console.error('Failed to get locations:', locErr);
    return;
  }

  for (const loc of locations) {
    let newTabName = `Suncoast Skin Solutions - ${loc.location_name}`;
    if (loc.location_name === 'St. Petersburg') {
        newTabName = `Suncoast Skin Solutions - St Petersburg`; // typically no period in tab names
    }
    console.log(`Updating ${loc.location_name} tab to: ${newTabName}`);
    
    const { error: upErr } = await supabase
      .from('gbp_locations')
      .update({ sheet_tab_name: newTabName })
      .eq('id', loc.id);

    if (upErr) {
      console.error(`Error updating ${loc.location_name}:`, upErr);
    }
  }

  console.log('Update complete.');
}

run();
