
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('--- API Key Validation Test ---');
console.log('URL:', supabaseUrl);
console.log('Key prefix:', supabaseKey ? supabaseKey.substring(0, 15) + '...' : 'MISSING');

if (!supabaseKey || !supabaseKey.startsWith('eyJ')) {
    console.warn('\n⚠️  WARNING: Key does NOT start with "eyJ". Standard Supabase keys are JWTs.');
    console.warn('Current format looks like:', supabaseKey ? supabaseKey.split('_')[0] : 'N/A');
}

async function testKey() {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Try a public table read or simple health check
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('\n❌ Connection Failed!');
            console.error('Error Message:', error.message);
            console.error('Hint: If this is a 401/403 or "JWT" error, the key is invalid.');
        } else {
            console.log('\n✅ Key seems valid! Connection successful.');
        }
    } catch (err) {
        console.error('\n❌ Client Initialization Failed:', err.message);
    }
}

testKey();
