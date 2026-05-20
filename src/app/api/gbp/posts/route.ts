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
    const { gbp_client_id, location_id, post_topic, post_body, image_prompt, link_url, image_url } = body;

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

    // Process image_url if provided
    let permanent_image_url = null;
    if (image_url) {
        try {
            console.log(`Downloading image from ${image_url}...`);
            const imgRes = await fetch(image_url);
            if (imgRes.ok) {
                const arrayBuffer = await imgRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const fileName = `${gbp_client_id}/${Date.now()}.png`;

                const { data: uploadData, error: uploadError } = await supabaseAdmin
                    .storage
                    .from('gbp_images')
                    .upload(fileName, buffer, {
                        contentType: 'image/png',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Storage upload error:', uploadError);
                } else {
                    const { data: publicUrlData } = supabaseAdmin
                        .storage
                        .from('gbp_images')
                        .getPublicUrl(fileName);
                    
                    permanent_image_url = publicUrlData.publicUrl;
                }
            } else {
                console.error(`Failed to download image from n8n. Status: ${imgRes.status}`);
            }
        } catch (e) {
            console.error('Error handling image download:', e);
        }
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
            image_url: permanent_image_url,
            status: 'DRAFT',
            generated_at: new Date().toISOString(),
        }])
        .select('id')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, post_id: data.id });
}
