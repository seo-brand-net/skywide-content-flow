require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Use exact test webhook ID
const WEBHOOK_URL = 'https://seobrand.app.n8n.cloud/webhook-test/c9d7ab2c-298f-4b57-be8e-235a1c25f1ef';

const BILLY_IDS = [
  '26f67f72-a533-471d-b77e-df000fc24ce9', 
  // '51614746-a76f-41e3-a7f0-a71341b43288' // Only running ONE to prevent test mode crashing
];

const SELECT = 'id, user_id, article_title, title_audience, client_name, client_website_url, creative_brief, word_count, article_type, primary_keywords, secondary_keywords, semantic_themes, tone, page_intent, created_at';

async function sendTest() {
    console.log('Fetching Billy\\'s specific request from Supabase...');
    
    for (const id of BILLY_IDS) {
        const { data: run, error } = await supabase
            .from('content_requests')
            .select(SELECT)
            .eq('id', id)
            .single();
            
        if (error || !run) {
            console.error(`Error fetching ID ${id}:`, error);
            continue;
        }
        
        console.log(`\nSending request for client: ${run.client_name} (ID: ${run.id})`);
        
        // Exact same payload shape as dashboard/page.tsx
        const payload = {
            title:              run.article_title,
            audience:           run.title_audience         || '',
            client_name:        run.client_name,
            client_website_url: run.client_website_url     || '',
            creative_brief:     run.creative_brief,
            article_type:       run.article_type           || 'Blogs',
            word_count:         String(run.word_count      || 900),
            primary_keywords:   Array.isArray(run.primary_keywords)
                                    ? run.primary_keywords[0]
                                    : (run.primary_keywords  || ''),
            secondary_keywords: Array.isArray(run.secondary_keywords)
                                    ? run.secondary_keywords.join(', ')
                                    : (run.secondary_keywords || ''),
            semantic_theme:     Array.isArray(run.semantic_themes)
                                    ? run.semantic_themes.join(', ')
                                    : (run.semantic_themes   || ''),
            tone:               run.tone                   || 'Professional',
            page_intent:        run.page_intent            || '',
            request_id:         run.id,
            run_id:             crypto.randomUUID(),
            user_id:            run.user_id,
            timestamp:          new Date().toISOString(),
        };
        
        try {
            const res = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                console.log('✅ Successfully triggered webhook.');
                console.log('Response:', await res.text());
                console.log('\nThe workflow is now executing in n8n! Switch over to your browser to watch it run.');
            } else {
                console.error('❌ Failed to trigger webhook. Status:', res.status);
                console.error('Error text:', await res.text());
            }
        } catch (e) {
            console.error('❌ Network error triggering webhook:', e);
        }
    }
}

sendTest().catch(console.error);
