
import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkMichael() {
    const email = 'michael@seobrand.net';

    // 1. Check Live DB
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (profile) {
        const { count } = await supabase.from('content_requests').select('*', { count: 'exact', head: true }).eq('user_id', profile.id);
        console.log('LIVE DB:', { email: profile.email, role: profile.role, content_count: count });
    } else {
        console.log('LIVE DB: No profile found for ' + email);
    }

    // 2. Check Backup File
    const backupPath = path.resolve(process.cwd(), 'backup_real.json');
    if (fs.existsSync(backupPath)) {
        const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        const nameVariations = (backup['profiles'] || []).filter((p: any) =>
            p.email?.toLowerCase().includes('michael') ||
            p.email?.toLowerCase().includes('mike')
        );

        if (nameVariations.length > 0) {
            console.log('BACKUP SEARCH RESULTS:');
            nameVariations.forEach((p: any) => {
                const count = (backup['content_requests'] || []).filter((r: any) => r.user_id === p.id).length;
                console.log(`- ${p.email} (Role: ${p.role}, ID: ${p.id}, Content Count: ${count})`);
            });
        } else {
            console.log('BACKUP: No matching emails found for "michael" or "mike"');
        }
    }
}

checkMichael();
