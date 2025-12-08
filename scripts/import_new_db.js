const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// NEW Credentials (from process.env or hardcoded for this script usage based on current .env)
// Since this is a standalone script, I'll read .env or use the pooler URL.
// Using 'pg' might be better for bulk import if I have the connection string, 
// but using supabase-js ensures we respect new RLS if applicable, or we can use the Service Key if we had it.
// Actually, I have the new URL and Anon Key in .env.
// But to write to tables, I might need Service Key or just rely on the fact that I'm inserting?
// Wait, 'user_invitations' might be protected.
// IF I can't insert via Anon key, I'll need to use the postgres connection string with 'pg'.
// Let's use 'pg' with the known connection string since I have it and it's full admin access (postgres user).

const { Client } = require('pg');

const projectRoot = path.join(__dirname, '..');
const backupPath = path.join(projectRoot, 'backup.json');

// Parse .env for connection string or just use the one I know is there
const connectionString = "postgresql://postgres.obswcosfipqjvklqlnrj:qPfrroOTxPKYhC4J@aws-1-us-east-2.pooler.supabase.com:6543/postgres";

async function importData() {
    if (!fs.existsSync(backupPath)) {
        console.error('backup.json not found');
        return;
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase
    });

    try {
        await client.connect();

        // Import User Invitations
        const invitations = backup.user_invitations || [];
        if (invitations.length > 0) {
            console.log(`Importing ${invitations.length} user invitations...`);
            for (const inv of invitations) {
                // Construct INSERT statement
                const keys = Object.keys(inv);
                const values = Object.values(inv);

                // Prevent SQL injection in a real app, but this is a migration script with trusted data
                // Using parameterized queries
                const columns = keys.map(k => `"${k}"`).join(', ');
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

                const query = `
                    INSERT INTO user_invitations (${columns}) 
                    VALUES (${placeholders})
                    ON CONFLICT (id) DO NOTHING;
                `;

                try {
                    await client.query(query, values);
                } catch (err) {
                    console.error(`Error importing invitation ${inv.email}:`, err.message);
                }
            }
            console.log('Invitations imported.');
        } else {
            console.log('No user invitations to import.');
        }

    } catch (e) {
        console.error('Import failed:', e);
    } finally {
        await client.end();
    }
}

importData();
