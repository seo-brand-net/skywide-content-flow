const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// OLD Credentials from previous .env version
const OLD_SUPABASE_URL = "https://sgwocrvftiwxofvykmhh.supabase.co";
const OLD_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnd29jcnZmdGl3eG9mdnlrbWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTY3MDAsImV4cCI6MjA2NzU3MjcwMH0.FLxwNZ4i7gu_5-IUykJCPQMwSxPHMLuT-RAoF48Flo8";

const supabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);

const tables = [
    'profiles',
    'features',
    'content_requests',
    'ai_conversations',
    'ai_messages',
    'user_invitations'
];

async function dumpData() {
    console.log(`Connecting to OLD database: ${OLD_SUPABASE_URL}`);
    const backup = {};

    for (const table of tables) {
        console.log(`Fetching ${table}...`);
        try {
            const { data, error } = await supabase.from(table).select('*');
            if (error) {
                console.error(`Error fetching ${table}:`, error.message);
                backup[table] = [];
            } else {
                console.log(`  Found ${data.length} rows.`);
                backup[table] = data;
            }
        } catch (e) {
            console.error(`  Exception fetching ${table}:`, e.message);
        }
    }

    const outputPath = path.join(__dirname, '..', 'backup.json');
    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));
    console.log(`\nBackup saved to ${outputPath}`);
}

dumpData();
