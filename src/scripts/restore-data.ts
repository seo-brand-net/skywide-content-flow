import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Destination (New) DB Config
const NEW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const NEW_SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!NEW_SUPABASE_URL || !NEW_SUPABASE_SERVICE_KEY) {
    console.error("Missing NEW_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
    process.exit(1);
}

const client = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function restoreData() {
    const backupPath = path.join(process.cwd(), 'backup_real.json');
    if (!fs.existsSync(backupPath)) {
        console.error("Backup file not found:", backupPath);
        return;
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log("Loaded backup data.");

    // 1. Build User Lookups (Email -> New User ID)
    console.log("Fetching current users...");
    const { data: { users }, error: usersError } = await client.auth.admin.listUsers();

    if (usersError || !users) {
        console.error("Error listing users:", usersError);
        return;
    }

    const emailToNewId = new Map<string, string>();
    users.forEach(u => {
        if (u.email) emailToNewId.set(u.email.toLowerCase(), u.id);
    });

    // 2. Map Old ID -> New ID
    const oldIdToNewId = new Map<string, string>();

    // Process Profiles ONLY to build the map (we don't insert profiles to avoid overwriting current data/roles)
    // Or we can update them? For now, we only need the ID mapping.
    // If the old user exists in the new DB (by email), we map them.
    for (const oldProfile of backup['profiles'] || []) {
        const email = oldProfile.email?.toLowerCase();
        if (email && emailToNewId.has(email)) {
            const newId = emailToNewId.get(email)!;
            oldIdToNewId.set(oldProfile.id, newId);
            console.log(`Mapped User: ${email} (${oldProfile.id} -> ${newId})`);
        } else {
            console.warn(`Skipping User: ${email} (Not found in new DB)`);
        }
    }

    // 3. Restore Content Requests
    console.log(`\nRestoring Content Requests...`);
    const requests = backup['content_requests'] || [];
    let reqCount = 0;

    for (const req of requests) {
        const newUserId = oldIdToNewId.get(req.user_id);
        if (!newUserId) continue;

        // Prepare object for insertion (remove ID to let new DB generate it, or keep it?)
        // Better to remove ID to avoid conflicts if UUIDs collide, though unlikely. 
        // ACTUALLY: Let's keep ID if possible to maintain relationships, but if it conflicts we fail.
        // Safer: Let DB generate new ID. But wait, ai_conversations link to content_requests?
        // Checking schema: ai_conversations.content_request_id REFERENCES content_requests(id)
        // So we MUST Map Request IDs too if we let DB generate new ones.

        // Strategy: Try to insert with OLD ID. If conflict, update?
        // Or "Upsert".
        const { error } = await client
            .from('content_requests')
            .upsert({
                ...req,
                user_id: newUserId, // Remapped Owner
                updated_at: new Date().toISOString() // Touch update time
            });

        if (error) {
            console.error(`Failed to restore request ${req.id}:`, error.message);
        } else {
            reqCount++;
        }
    }
    console.log(`Restored ${reqCount} Content Requests.`);

    // 4. Restore AI Conversations
    console.log(`\nRestoring AI Conversations...`);
    const conversations = backup['ai_conversations'] || [];
    let convCount = 0;

    // Map Old Conv ID -> New Conv ID (if we decide to regenerate, but for now Upserting with old ID is safest for relational integrity)
    for (const conv of conversations) {
        const newUserId = oldIdToNewId.get(conv.user_id);
        if (!newUserId) continue;

        const { error } = await client
            .from('ai_conversations')
            .upsert({
                ...conv,
                user_id: newUserId
            });

        if (error) {
            console.error(`Failed to restore conversation ${conv.id}:`, error.message);
        } else {
            convCount++;
        }
    }
    console.log(`Restored ${convCount} AI Conversations.`);

    // 5. Restore AI Messages
    console.log(`\nRestoring AI Messages...`);
    const messages = backup['ai_messages'] || [];
    let msgCount = 0;

    for (const msg of messages) {
        // Only restore if conversation exists (orphaned messages check)
        // With Upsert, parent FK constraint will catch orphans.

        const { error } = await client
            .from('ai_messages')
            .upsert({
                ...msg
                // No user_id here typically, just conversation_id
            });

        if (error) {
            // Likely orphan if parent conversation wasn't restored (e.g. user skipped)
            // console.error(`Failed to restore message ${msg.id}:`, error.message);
        } else {
            msgCount++;
        }
    }
    console.log(`Restored ${msgCount} AI Messages.`);

    console.log("\nRestoration Complete!");
}

restoreData().catch(console.error);
