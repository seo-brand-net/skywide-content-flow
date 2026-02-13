
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('--- DEEP DIAGNOSTIC TEST ---');
console.log('1. Checking Environment Variables...');
console.log('   URL:', supabaseUrl);
console.log('   Key Starts with eyJ:', supabaseKey?.startsWith('eyJ'));

async function runDiagnostics() {
    try {
        console.log('\n2. Testing Raw HTTP Connectivity (Fetch)...');
        const fetchStart = Date.now();
        const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
            headers: { 'apikey': supabaseKey }
        });
        const fetchEnd = Date.now();
        console.log(`   Status: ${res.status} ${res.statusText}`);
        console.log(`   Response Time: ${fetchEnd - fetchStart}ms`);

        console.log('\n3. Testing Supabase SDK Connection...');
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('   ❌ SDK Error:', error.message);
            console.error('   Error Code:', error.code);
        } else {
            console.log('   ✅ SDK Connection Successful!');
        }

        console.log('\n4. Summary:');
        if (res.status === 200 || res.status === 201) {
            console.log('   >>> NETWORK IS WORKING AT SYSTEM LEVEL <<<');
            console.log('   If the browser still fails, it is 100% a browser extension, cache, or ad-blocker issue.');
        } else {
            console.log('   >>> NETWORK BLOCK DETECTED at system/API level. Check firewall/VPN. <<<');
        }

    } catch (err) {
        console.error('\n❌ CRITICAL ERROR during diagnostics:', err.message);
        if (err.cause) console.error('   Cause:', err.cause);
    }
}

runDiagnostics();
