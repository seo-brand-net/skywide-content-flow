const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');

// Simple .env parser to avoid checking for dotenv dependency
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
        if (match) {
            connectionString = match[1];
        }
    } catch (e) {
        console.log('.env file not found or unreadable, checking process.env');
    }
}

if (!connectionString) {
    console.error('DATABASE_URL not found in .env or process.env');
    process.exit(1);
}

console.log('Connecting to database...');
const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await client.connect();

        if (!fs.existsSync(migrationsDir)) {
            console.error(`Migrations directory not found at ${migrationsDir}`);
            process.exit(1);
        }

        const files = fs.readdirSync(migrationsDir).sort();

        if (files.length === 0) {
            console.log('No migration files found.');
            return;
        }

        console.log(`Found ${files.length} migration files.`);

        for (const file of files) {
            if (file.endsWith('.sql')) {
                console.log(`Applying migration: ${file}`);
                const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                try {
                    await client.query(content);
                } catch (err) {
                    if (err.code === '42P07') { // duplicate_table
                        console.log(`  Skipping ${file}: Table already exists.`);
                    } else if (err.code === '42710') { // duplicate_object
                        console.log(`  Skipping ${file}: Object already exists.`);
                    } else {
                        console.error(`Error applying ${file}:`, err.message);
                        throw err;
                    }
                }
            }
        }
        console.log('All migrations applied successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
