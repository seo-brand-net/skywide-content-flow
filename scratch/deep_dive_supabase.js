require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deepDiveSupabase() {
    console.log('Fetching oldest content requests from Supabase...');
    
    // Fetch oldest to newest to analyze the progression
    const { data: requests, error } = await supabase
        .from('content_requests')
        .select('id, created_at, client_name, creative_brief, raw_content')
        .not('raw_content', 'is', null)
        .order('created_at', { ascending: true })
        .limit(100);

    if (error) {
        console.error('Supabase error:', error);
        return;
    }

    console.log(`Found ${requests.length} historical requests with raw content.`);

    let report = '=== SUPABASE HISTORICAL CONTENT AUDIT (Oldest to Newest) ===\n\n';
    let analyzedCount = 0;

    for (const req of requests) {
        if (!req.raw_content || req.raw_content.length < 100) continue;

        const dateStr = new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const text = req.raw_content;
        const words = text.split(/\s+/).length;
        
        // Truncation check
        const cleanEnd = text.trim();
        const endsWithPunctuation = /[.!?]"?$/.test(cleanEnd);
        const hasTruncation = !endsWithPunctuation;

        // Hallucination checks
        const hasNumberHallucinations = /\d{2,}%/.test(text);
        const hasPractitionerHallucinations = /American Psychological Association/i.test(text) || 
                                             /practitioners consistently see/i.test(text) || 
                                             /clinical experience shows/i.test(text);
        
        // Check if brief had strict rules
        const briefLen = req.creative_brief ? req.creative_brief.length : 0;

        report += `[${dateStr}] Client: ${req.client_name}\n`;
        report += `  - Word Count: ${words} words\n`;
        report += `  - Truncated? ${hasTruncation}\n`;
        report += `  - % Hallucinations? ${hasNumberHallucinations}\n`;
        report += `  - Practitioner Hallucinations? ${hasPractitionerHallucinations}\n`;
        report += `  - Brief Length: ${briefLen} chars\n`;
        
        // Output a snippet of the end if truncated to prove it
        if (hasTruncation) {
            report += `  - Snippet (End): "...${cleanEnd.substring(cleanEnd.length - 100).replace(/\n/g, ' ')}"\n`;
        }
        report += `\n`;

        analyzedCount++;
    }

    report = `Analyzed ${analyzedCount} successful content generations from Supabase.\n\n` + report;
    fs.writeFileSync('scratch/supabase_historical_audit.txt', report);
    console.log('Deep audit saved to scratch/supabase_historical_audit.txt');
}

deepDiveSupabase().catch(console.error);
