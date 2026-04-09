/**
 * Seed Script: 5 Initial Indexing Clients
 * 
 * Run with: npx ts-node scripts/seed-indexing-clients.ts
 * 
 * NOTE: workbook_url values are placeholders — update them in Supabase
 * once Mike provides the actual spreadsheet URLs for each client.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const clients = [
    {
        name: 'AgriBilt',
        workbook_url: 'https://docs.google.com/spreadsheets/d/1L2obyQjLNUtL2zrTbwMqT6BjePdOgGM1KekX-vLadbk/edit?gid=177527161#gid=177527161',
        tab_name: 'Indexing Automation',
        gsc_property: 'https://agribilt.com/',
        bing_site_url: 'https://agribilt.com',
        is_active: true
    },
    {
        name: 'Anderson Seafoods',
        workbook_url: 'https://docs.google.com/spreadsheets/d/1z9TUbye6zLrT-m5b3Mh01OWdT3pSDI6CvXprOGZEg34/edit?gid=1589872104#gid=1589872104',
        tab_name: 'Indexing Automation',
        gsc_property: 'https://www.shopandersonseafoods.com/',
        bing_site_url: 'https://www.shopandersonseafoods.com/',
        is_active: true
    },
    {
        name: 'Glyk Gelato',
        workbook_url: 'https://docs.google.com/spreadsheets/d/1W4bQWeAZYsQcuqrisHQvilJ2kIlP-Fa5IutXKoy3-H8/edit?gid=1589872104#gid=1589872104',
        tab_name: 'Indexing Automation',
        gsc_property: 'https://glyk.com/',
        bing_site_url: 'https://glyk.com/',
        is_active: true
    },
    {
        name: 'DIR Salon',
        workbook_url: 'https://docs.google.com/spreadsheets/d/1ZNYosHujVNtFvwdJUeNLt9d8srkneZHP5e9WD-pF9x0/edit?gid=2121259813#gid=2121259813',
        tab_name: 'Indexing Automation',
        gsc_property: 'https://www.dirsalonfurniture.com/',
        bing_site_url: 'https://www.dirsalonfurniture.com/',
        is_active: true
    },
    {
        name: 'Zen Renovations',
        workbook_url: 'https://docs.google.com/spreadsheets/d/1U4vZgYhSoQaXpCsoPxbPeSJmMZaXs2F3LE2Zjt3DNrQ/edit?gid=217284013#gid=217284013',
        tab_name: 'Indexing Automation',
        gsc_property: 'https://zen-renovations.com/',
        bing_site_url: 'https://zen-renovations.com/',
        is_active: true
    }
];

async function seed() {
    console.log('🌱 Seeding indexing_clients table...\n');

    for (const client of clients) {
        const { data, error } = await supabase
            .from('indexing_clients')
            .upsert([client], { onConflict: 'name' })
            .select();

        if (error) {
            console.error(`❌ Failed to insert "${client.name}":`, error.message);
        } else {
            console.log(`✅ ${client.name} — ${data?.[0]?.id}`);
        }
    }

    console.log('\n✅ Done. Remember to update workbook_url values with actual spreadsheet URLs!');
    console.log('   You can do this directly in Supabase Studio → Table Editor → indexing_clients');
}

seed().catch(console.error);
