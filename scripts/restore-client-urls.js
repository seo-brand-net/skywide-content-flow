/**
 * Restore Script: workbook_url / folder_url / folder_id for clients that lost
 * them in the 2026-07-13 bulk client-insert migration.
 *
 * Run with: node scripts/restore-client-urls.js
 * Add --dry-run to preview without writing: node scripts/restore-client-urls.js --dry-run
 *
 * Only touches Section 1 (high-confidence) rows from the investigation.
 * Before writing, re-checks each row is still actually blank (workbook_url
 * IS NULL) so it never overwrites data someone already fixed by hand.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local or .env');
    process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Section 1 — high confidence matches against clients_seed.json (pre-migration baseline)
const restores = [
    { id: '60029889-a6eb-4e2e-88eb-940dfd95ad46', name: 'Bennet Movers', matchedSeedName: 'Bennett Movers',
      workbook_url: 'https://docs.google.com/spreadsheets/d/17ug5Xqua7vy3HKnCQF_3PAHPVmYI9Rl0dNicw1W0YkU/edit?gid=824764018#gid=824764018',
      folder_url: 'https://drive.google.com/drive/folders/1UbOWZyChBBTDeTLoQmC115i4kQeRxLLc', folder_id: '1UbOWZyChBBTDeTLoQmC115i4kQeRxLLc' },
    { id: 'f558de74-5d42-44af-87d1-53b2a583a7f8', name: 'BP Funding', matchedSeedName: 'BP Fund',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1lNwai2YvVnWOJBPmWkVSIr4qFjBXLU3S-QJdlTrYrEQ/edit?gid=518697244#gid=518697244',
      folder_url: 'https://drive.google.com/drive/folders/1TPPSrZ0JWRUhTudvIqMdDuzt79-NKrQ9', folder_id: '1TPPSrZ0JWRUhTudvIqMdDuzt79-NKrQ9' },
    { id: '54a4be8a-617f-4263-8456-aa512ea972f2', name: 'Celsia', matchedSeedName: 'Celsia Inc',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1f3BPtsYLVHrrwVCVsOVjc9GkQjRTkIp0pKbAPsVuMPc/edit?gid=1875405473#gid=1875405473',
      folder_url: 'https://drive.google.com/drive/folders/1t7hlFSrZoNwLfm8fQCGA3e2u7GKHWvj7', folder_id: '1t7hlFSrZoNwLfm8fQCGA3e2u7GKHWvj7' },
    { id: '26665199-7e53-44db-a051-24fe19456af8', name: 'Century Bathrooms & Kitchens', matchedSeedName: 'Century Bathrooms',
      workbook_url: 'https://docs.google.com/spreadsheets/d/11BEqDh273TpaGmcPu1JYlbL1jjIvyGszNecZUKSO7Fg/edit?gid=845084514#gid=845084514',
      folder_url: 'https://drive.google.com/drive/folders/1KEcxWqsijUVWOLib3V2WxolefK0HFJ5S', folder_id: '1KEcxWqsijUVWOLib3V2WxolefK0HFJ5S' },
    { id: '2d6f61eb-e24f-4955-90e3-94e0c317bd9c', name: 'Croc-Crete', matchedSeedName: 'Croc Crete',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1VASh-mGqVXys_3_H4zVCxaE2FllFby9VLuoppFM8X9s/edit?gid=428745089#gid=428745089',
      folder_url: 'https://drive.google.com/drive/folders/1qVB_cbb9FMnz_Zk2hQK4MccuG84-rmfL', folder_id: '1qVB_cbb9FMnz_Zk2hQK4MccuG84-rmfL' },
    { id: 'a5d7c0c4-962e-4586-9d95-2d8981424d0a', name: 'Gordon & Partners Law Firm', matchedSeedName: 'Gordon & Partners',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1Ovhx7BxtQDb1nfdEBhH1RN3TAaA8QmJUWPonVcd3gXE/edit?gid=174256482#gid=174256482',
      folder_url: 'https://drive.google.com/drive/folders/1okqZRCZ9u1iu-cmH7-jT5vWFVdONb6bM', folder_id: '1okqZRCZ9u1iu-cmH7-jT5vWFVdONb6bM' },
    { id: 'cb699310-2cc9-4dd2-8f6e-5e72481f1908', name: 'Kemper', matchedSeedName: 'Kemper.com',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1cPGukUlFhs837F5RMfOQwALnI2KoQf8b_pYwn97j2I4/edit?gid=256413383#gid=256413383',
      folder_url: 'https://drive.google.com/drive/folders/1F4fyt_KrPurHAoX20oxSsnjXhLS8OIQK', folder_id: '1F4fyt_KrPurHAoX20oxSsnjXhLS8OIQK' },
    { id: '32a4c9d1-8462-46c0-aace-82246cb55caf', name: 'Liburdi Dimetrics', matchedSeedName: 'Liburdi Metrics',
      workbook_url: 'https://docs.google.com/spreadsheets/d/13c4pMYalRqHgFjbwr3vyu6Z43X_M8bs1kU4NfeTV8h8/edit?gid=1380024631#gid=1380024631',
      folder_url: 'https://drive.google.com/drive/folders/1PDUtp4m5T08-ByISQZVwU-KmZ4v8Hum2', folder_id: '1PDUtp4m5T08-ByISQZVwU-KmZ4v8Hum2' },
    { id: 'e5677a55-4e81-4c72-88e9-473fcc74e641', name: 'Longevity Center of America', matchedSeedName: 'The Longevity Center Of America',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1WJgHiHzgc0-NNWABoH0zQ0d3uAfnUfPJ4phAEyH5JM0/edit?gid=993091838#gid=993091838',
      folder_url: 'https://drive.google.com/drive/folders/1Rlnoq2h1Cyd0hjvNFAQDrszsrt7y-xNK', folder_id: '1Rlnoq2h1Cyd0hjvNFAQDrszsrt7y-xNK' },
    { id: 'fbaaacd8-0891-4804-b6fc-321a7c2c1dff', name: 'The Longevity Center', matchedSeedName: 'The Longevity Center Of America',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1WJgHiHzgc0-NNWABoH0zQ0d3uAfnUfPJ4phAEyH5JM0/edit?gid=993091838#gid=993091838',
      folder_url: 'https://drive.google.com/drive/folders/1Rlnoq2h1Cyd0hjvNFAQDrszsrt7y-xNK', folder_id: '1Rlnoq2h1Cyd0hjvNFAQDrszsrt7y-xNK' },
    { id: '5b6362ad-564f-4391-98c7-24467a8fab31', name: 'Most Wanted Silver', matchedSeedName: 'The Most Wanted Silver',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1xNi5hQ7ba-GwX5tsOBdOHqZIrGsVOn1blRJW5s1X8M0/edit?gid=1423993129#gid=1423993129',
      folder_url: 'https://drive.google.com/drive/folders/1U8YgxXDUjPfc2eKAoDkVJ6oxwNhqNtqU', folder_id: '1U8YgxXDUjPfc2eKAoDkVJ6oxwNhqNtqU' },
    { id: '9ceb722a-48f1-4912-863a-ff9cdd98756f', name: 'The Most Wanted Custom Silver', matchedSeedName: 'The Most Wanted Silver',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1xNi5hQ7ba-GwX5tsOBdOHqZIrGsVOn1blRJW5s1X8M0/edit?gid=1423993129#gid=1423993129',
      folder_url: 'https://drive.google.com/drive/folders/1U8YgxXDUjPfc2eKAoDkVJ6oxwNhqNtqU', folder_id: '1U8YgxXDUjPfc2eKAoDkVJ6oxwNhqNtqU' },
    { id: '8b2e82f7-a943-4ee7-a70e-4aa38aa74904', name: 'Muddy Matt', matchedSeedName: 'Muddy Mat',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1jxjVPldgk6iKwBTfk6zJspb0XrIhjaLlQO51JrDeFlQ/edit?gid=1439700727#gid=1439700727',
      folder_url: 'https://drive.google.com/drive/folders/1qXWhia9UT7pOHhbdoe-DwoNy12dI_Uvv', folder_id: '1qXWhia9UT7pOHhbdoe-DwoNy12dI_Uvv' },
    { id: 'e2d88adb-b454-405a-b290-987b7e82cd97', name: 'New Hope Fertility Center', matchedSeedName: 'New Hope Fertility',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1g9bv575i8CMStEJ6gV1MZQHS1yc-K-8QlgTc4Hnhf_o/edit?gid=1587180893#gid=1587180893',
      folder_url: 'https://drive.google.com/drive/folders/1zuDqCMu2K2BOW3Pa3CFsJEc0NZgK9e5i', folder_id: '1zuDqCMu2K2BOW3Pa3CFsJEc0NZgK9e5i' },
    { id: 'ec3dfc10-10b6-4367-af95-54d5cb8426a8', name: 'New Hope Fertility Clinic', matchedSeedName: 'New Hope Fertility',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1g9bv575i8CMStEJ6gV1MZQHS1yc-K-8QlgTc4Hnhf_o/edit?gid=1587180893#gid=1587180893',
      folder_url: 'https://drive.google.com/drive/folders/1zuDqCMu2K2BOW3Pa3CFsJEc0NZgK9e5i', folder_id: '1zuDqCMu2K2BOW3Pa3CFsJEc0NZgK9e5i' },
    { id: '1595b134-6c3e-49b5-81a3-2dcce92c2908', name: 'PDH-Pro', matchedSeedName: 'Pdh-pro.com',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1Mq6Vb8D7_TNHobB9nv3yoO15ObZIP0XIPU4FsX640_k/edit?gid=21659349#gid=21659349',
      folder_url: 'https://drive.google.com/drive/folders/1vmjhwIpux38QGcDnG5bHpa7jNRJ35-ER', folder_id: '1vmjhwIpux38QGcDnG5bHpa7jNRJ35-ER' },
    { id: '76e18e67-c7ce-4821-b327-0851989fde65', name: 'Sacred Connections', matchedSeedName: 'Sacred Connection',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1Zsdjk-epyfUdqhgGgvNa8UU1IRQY2tU0TeOvTq3n5xg/edit?gid=2064071563#gid=2064071563',
      folder_url: 'https://drive.google.com/drive/folders/1V5iR66WiNV4DLx4LaXpAg_bWTtva1oOm', folder_id: '1V5iR66WiNV4DLx4LaXpAg_bWTtva1oOm' },
    { id: '85a92131-bb57-45ce-90a6-c46420d0befc', name: 'Senior Living Guide', matchedSeedName: 'Senior Living',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1qy5KdnnH0v31zmlBDOwFEIb0-tpYnsCUlk2b0g6XzYQ/edit?gid=1209451215#gid=1209451215',
      folder_url: 'https://drive.google.com/drive/folders/1EE4KYIwngdYeP-ucRVSi_kLdc9kBKg3o', folder_id: '1EE4KYIwngdYeP-ucRVSi_kLdc9kBKg3o' },
    { id: '59e435d3-3ad8-4a4a-bca3-692624149852', name: 'Super Car Claims', matchedSeedName: 'Supercarclaims.com',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1LQ3v91HJH8Z2OiO_44ZcZ9US8831boDiGgnwWWkisI0/edit?gid=347655946#gid=347655946',
      folder_url: 'https://drive.google.com/drive/folders/1UgcGTB2Gscr3L6xbGXFn7r7VO-fU1SSS', folder_id: '1UgcGTB2Gscr3L6xbGXFn7r7VO-fU1SSS' },
    { id: 'c2fdcc01-1090-4984-8633-4fb48813e6c2', name: 'SuperCar Claims', matchedSeedName: 'Supercarclaims.com',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1LQ3v91HJH8Z2OiO_44ZcZ9US8831boDiGgnwWWkisI0/edit?gid=347655946#gid=347655946',
      folder_url: 'https://drive.google.com/drive/folders/1UgcGTB2Gscr3L6xbGXFn7r7VO-fU1SSS', folder_id: '1UgcGTB2Gscr3L6xbGXFn7r7VO-fU1SSS' },
    { id: '09d8cb88-f9c6-4177-ba00-fc3a285d0a80', name: 'The Ridge RTC', matchedSeedName: 'The Ridge',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1kSnP186sRKYJPyFs2PHmgUQ4tYi-8L8wTqol-PJX_CE/edit?gid=772709702#gid=772709702',
      folder_url: 'https://drive.google.com/drive/folders/1ZWg4EkBDgglB2wanWPhqBtDWKhaLD1-M', folder_id: '1ZWg4EkBDgglB2wanWPhqBtDWKhaLD1-M' },
    { id: 'd0045e7b-e152-411c-90f0-cd82e9766c1a', name: 'YAD-Tech', matchedSeedName: 'Yadtech',
      workbook_url: 'https://docs.google.com/spreadsheets/d/1rsAmlQ2VHClAYbx6MmheH-79FvEEBfR9mTxfQXEUrBk/edit?gid=1260252567#gid=1260252567',
      folder_url: 'https://drive.google.com/drive/folders/1SQB_Cmm20rN5f3QzvzZPB-J0wZw9-a2C', folder_id: '1SQB_Cmm20rN5f3QzvzZPB-J0wZw9-a2C' },
];

async function main() {
    console.log(`${dryRun ? '[DRY RUN] ' : ''}Restoring ${restores.length} client rows...\n`);

    let updated = 0, skipped = 0, errors = 0;

    for (const r of restores) {
        const { data: current, error: fetchErr } = await supabase
            .from('clients')
            .select('id, name, workbook_url, folder_url, folder_id')
            .eq('id', r.id)
            .single();

        if (fetchErr) {
            console.error(`  [ERROR] ${r.name} (${r.id}): could not fetch row — ${fetchErr.message}`);
            errors++;
            continue;
        }
        if (!current) {
            console.error(`  [ERROR] ${r.name} (${r.id}): row not found`);
            errors++;
            continue;
        }
        if (current.workbook_url) {
            console.log(`  [SKIP] ${r.name}: already has a workbook_url (someone beat us to it) — leaving alone`);
            skipped++;
            continue;
        }

        console.log(`  [${dryRun ? 'WOULD UPDATE' : 'UPDATING'}] ${r.name}  <=  seed:"${r.matchedSeedName}"`);
        if (dryRun) {
            updated++;
            continue;
        }

        const { error: updateErr } = await supabase
            .from('clients')
            .update({ workbook_url: r.workbook_url, folder_url: r.folder_url, folder_id: r.folder_id })
            .eq('id', r.id)
            .is('workbook_url', null); // extra guard against races

        if (updateErr) {
            console.error(`  [ERROR] ${r.name}: update failed — ${updateErr.message}`);
            errors++;
        } else {
            updated++;
        }
    }

    console.log(`\nDone. Updated: ${updated}, Skipped (already had data): ${skipped}, Errors: ${errors}`);
    if (dryRun) console.log('This was a dry run — nothing was written. Re-run without --dry-run to apply.');
}

main();
