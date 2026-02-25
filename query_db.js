require('dotenv').config();
const fs = require('fs');

async function main() {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Missing Supabase credentials in .env");
        return;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/content_requests?select=*&order=created_at.desc&limit=10`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            console.error("Error fetching data:", response.status, response.statusText);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log(`Found ${data.length} recent requests.`);
        data.forEach(req => {
            console.log(`ID: ${req.id} | Client: ${req.client_name} | Keyword: ${req.primary_keywords} | Status: ${req.status} | Time: ${req.created_at}`);
        });

    } catch (e) {
        console.error("Fetch error:", e);
    }
}

main();
