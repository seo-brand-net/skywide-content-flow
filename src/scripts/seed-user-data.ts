
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Destination (New) DB Config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    const backupPath = path.resolve(process.cwd(), 'backup_real.json');
    if (!fs.existsSync(backupPath)) {
        console.error(`Error: Backup file not found at ${backupPath}`);
        return;
    }

    console.log("Loading backup data...");
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log("Fetching all users from Supabase...");
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error("Error fetching users:", usersError);
        return;
    }

    console.log(`Found ${users.length} users in the system.`);

    const EXCLUDED_EMAILS = ['sam@seobrand.net', 'samuel@seobrand.net'];

    for (const user of users) {
        const email = user.email?.toLowerCase().trim();

        if (!email) continue;
        if (EXCLUDED_EMAILS.includes(email)) {
            console.log(`Skipping excluded user: ${email}`);
            continue;
        }

        console.log(`\nProcessing user: ${email}...`);

        // Find old profile to get old ID
        const oldProfile = (backup['profiles'] || []).find((p: any) =>
            p.email?.toLowerCase().trim() === email
        );

        if (!oldProfile) {
            console.log(`  No historical data found in backup for ${email}.`);
            continue;
        }

        const oldUserId = oldProfile.id;
        const newUserId = user.id;

        console.log(`  Found historical data (Old ID: ${oldUserId}). Restoring...`);

        // 1. Restore Content Requests
        const userRequests = (backup['content_requests'] || []).filter((r: any) => r.user_id === oldUserId);
        if (userRequests.length > 0) {
            const requestsToInsert = userRequests.map((r: any) => ({
                ...r,
                user_id: newUserId,
                updated_at: new Date().toISOString()
            }));

            const { error: reqError } = await supabase
                .from('content_requests')
                .upsert(requestsToInsert);

            if (reqError) console.error(`  Error restoring requests for ${email}:`, reqError.message);
            else console.log(`  Restored ${userRequests.length} content requests.`);
        }

        // 2. Restore AI Conversations
        const userConversations = (backup['ai_conversations'] || []).filter((c: any) => c.user_id === oldUserId);
        if (userConversations.length > 0) {
            const convosToInsert = userConversations.map((c: any) => ({
                ...c,
                user_id: newUserId,
            }));

            const { error: convError } = await supabase
                .from('ai_conversations')
                .upsert(convosToInsert);

            if (convError) console.error(`  Error restoring conversations for ${email}:`, convError.message);
            else {
                console.log(`  Restored ${userConversations.length} conversations.`);

                // 3. Restore AI Messages
                const userConvoIds = new Set(userConversations.map((c: any) => c.id));
                const userMessages = (backup['ai_messages'] || []).filter((m: any) => userConvoIds.has(m.conversation_id));

                if (userMessages.length > 0) {
                    const { error: msgError } = await supabase
                        .from('ai_messages')
                        .upsert(userMessages);

                    if (msgError) console.error(`  Error restoring messages for ${email}:`, msgError.message);
                    else console.log(`  Restored ${userMessages.length} messages.`);
                }
            }
        }
    }

    console.log("\nSeeding completed.");
}

main().catch(err => {
    console.error("Seeding script failed:", err);
    process.exit(1);
});
