
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing connection to:', supabaseUrl);

async function testConnection() {
    try {
        console.log('1. Standard Fetch Test...');
        const res = await fetch(`${supabaseUrl}/auth/v1/health`);
        console.log('Fetch Status:', res.status, res.statusText);

        console.log('\n2. Supabase Client Test...');
        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing env vars');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const start = Date.now();
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        const end = Date.now();

        if (error) {
            console.error('Supabase Error:', error.message);
            console.error('Full Error:', error);
        } else {
            console.log('Supabase Connection Successful!');
            console.log('Time taken:', end - start, 'ms');
        }
    } catch (err) {
        console.error('Script Error:', err);
        if (err.cause) console.error('Cause:', err.cause);
    }
}

testConnection();
