import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkUser(email: string) {
    console.log(`Checking user: ${email}...`);
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const user = data.users.find(u => u.email === email);
    if (user) {
        console.log(`✅ User found: ${email} (ID: ${user.id})`);
        console.log(`   Last sign in: ${user.last_sign_in_at}`);
        console.log(`   Confirmed at: ${user.email_confirmed_at}`);
    } else {
        console.log(`❌ User NOT found: ${email}`);
    }
}

async function run() {
    await checkUser('samuel@seobrand.net');
    await checkUser('gomandev@gmail.com');
}

run();
