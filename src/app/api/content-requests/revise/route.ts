import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const { requestId, improvementNotes } = await request.json();

        if (!requestId || !improvementNotes) {
            return NextResponse.json({ error: 'Missing requestId or improvementNotes' }, { status: 400 });
        }

        // 1. Fetch current request data
        const { data: req, error: fetchError } = await supabaseAdmin
            .from('content_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError || !req) {
            console.error('[Revise] Error fetching request:', fetchError);
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // 2. Update request with improvement notes and reset status
        const { error: updateError } = await supabaseAdmin
            .from('content_requests')
            .update({
                improvement_notes: improvementNotes,
                status: 'in_progress', // Set directly to in_progress as we are triggering the run
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (updateError) {
            console.error('[Revise] Error updating request:', updateError);
            return NextResponse.json({ error: 'Failed to update improvement notes' }, { status: 500 });
        }

        // 3. Trigger n8n via the proxy with improvement_notes
        const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/proxy-n8n`;
        
        const n8nPayload = {
            title: req.article_title,
            audience: req.title_audience,
            client_name: req.client_name,
            creative_brief: req.creative_brief,
            article_type: req.article_type,
            word_count: req.word_count,
            primary_keywords: req.primary_keywords?.[0] || '',
            secondary_keywords: req.secondary_keywords?.[0] || '',
            semantic_theme: req.semantic_themes?.[0] || '',
            tone: req.tone,
            page_intent: req.page_intent,
            requestId, // Standardized naming
            baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            user_id: req.user_id,
            improvement_notes: improvementNotes,
            timestamp: new Date().toISOString(),
        };

        const n8nResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n8nPayload),
        });

        if (!n8nResponse.ok) {
            const errorText = await n8nResponse.text();
            console.error('[Revise] n8n trigger failed:', errorText);
            return NextResponse.json({ error: 'Failed to trigger n8n revision', detail: errorText }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Revise] Uncaught error:', error);
        return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
    }
}
