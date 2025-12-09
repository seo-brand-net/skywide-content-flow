import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Credentials for the OLD Supabase project
const OLD_SUPABASE_URL = "https://sgwocrvftiwxofvykmhh.supabase.co";
const OLD_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnd29jcnZmdGl3eG9mdnlrbWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTY3MDAsImV4cCI6MjA2NzU3MjcwMH0.FLxwNZ4i7gu_5-IUykJCPQMwSxPHMLuT-RAoF48Flo8";

const client = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);

const TABLES_TO_DUMP = [
    'profiles',
    'content_requests',
    'ai_conversations',
    'ai_messages',
    'features'
];

async function dumpDatabase() {
    console.log(`Starting dump from ${OLD_SUPABASE_URL}...`);

    // Authenticate as Admin
    console.log('Authenticating as Admin...');
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email: "samuel@seobrand.net",
        password: "Farrahdc12@"
    });

    if (authError || !authData.session) {
        console.error('Authentication Failed:', authError?.message);
        return;
    }
    console.log('Authentication Successful!');

    const backupData: Record<string, any[]> = {};

    for (const tableName of TABLES_TO_DUMP) {
        process.stdout.write(`Fetching table '${tableName}'... `);

        try {
            const { data, error } = await client
                .from(tableName)
                .select('*');

            if (error) {
                console.error(`\nERROR fetching ${tableName}:`, error.message);
                backupData[tableName] = [];
            } else {
                console.log(`OK (${data?.length || 0} rows)`);
                backupData[tableName] = data || [];
            }
        } catch (err: any) {
            console.error(`\nCRASH fetching ${tableName}:`, err.message);
            backupData[tableName] = [];
        }
    }

    const outputPath = path.join(process.cwd(), 'backup_real.json');
    fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2));

    console.log(`\nDump completed! Saved to: ${outputPath}`);

    // Summary
    console.log('\nSummary:');
    Object.entries(backupData).forEach(([table, rows]) => {
        console.log(`- ${table}: ${rows.length} rows`);
    });
}

dumpDatabase().catch(console.error);
