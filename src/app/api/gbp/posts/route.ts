import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/gbp/posts
 * n8n calls this after generating a post to write the result back to Supabase.
 * Replaces the Google Sheets "Append to Sheet" node in the original workflow.
 *
 * Body: {
 *   gbp_client_id: string,
 *   location_id?: string,
 *   post_topic: string,
 *   post_body: string,
 *   image_prompt: string,
 *   link_url: string,
 * }
 */
export async function POST(request: Request) {
    const body = await request.json();
    const { gbp_client_id, location_id, post_topic, post_body, image_prompt, link_url } = body;

    if (!gbp_client_id || !post_topic) {
        return NextResponse.json({ error: 'gbp_client_id and post_topic are required' }, { status: 400 });
    }

    // Deduplication: skip if a DRAFT/APPROVED post for this topic already exists
    const { data: existing } = await supabaseAdmin
        .from('gbp_posts')
        .select('id')
        .eq('gbp_client_id', gbp_client_id)
        .eq('post_topic', post_topic)
        .in('status', ['DRAFT', 'APPROVED'])
        .limit(1);

    if (existing && existing.length > 0) {
        return NextResponse.json({ skipped: true, reason: 'Post already exists for this topic' });
    }

    const { data, error } = await supabaseAdmin
        .from('gbp_posts')
        .insert([{
            gbp_client_id,
            location_id: location_id || null,
            post_topic,
            post_body: post_body || null,
            image_prompt: image_prompt || null,
            link_url: link_url || null,
            status: 'DRAFT',
            generated_at: new Date().toISOString(),
        }])
        .select('id')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, post_id: data.id });
}
