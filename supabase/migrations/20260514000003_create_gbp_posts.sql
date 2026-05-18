-- GBP Automation: gbp_posts table
-- Replaces the "GBP Posts" Google Sheets tab per client.
-- n8n writes completed posts here with status = 'DRAFT'.
-- Internal team reviews in Skywide and sets status = 'APPROVED'.
-- Phase 4 (future): 'APPROVED' posts can be published to GBP via GMB API → status = 'PUBLISHED'.

CREATE TABLE public.gbp_posts (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gbp_client_id    uuid NOT NULL REFERENCES public.gbp_clients(id) ON DELETE CASCADE,
    location_id      uuid REFERENCES public.gbp_locations(id) ON DELETE SET NULL,
    post_topic       text NOT NULL,
    post_body        text,
    image_prompt     text,
    link_url         text,
    status           text NOT NULL DEFAULT 'DRAFT',  -- DRAFT | APPROVED | PUBLISHED
    reviewed_by      uuid,                            -- user_id of internal reviewer
    client_approved  boolean,                         -- null = not required, true/false = client reviewed
    generated_at     timestamptz,
    published_at     timestamptz,
    created_at       timestamptz DEFAULT now()
);

-- Index for UI filtering by client + status
CREATE INDEX gbp_posts_client_status_idx ON public.gbp_posts(gbp_client_id, status);

-- RLS
ALTER TABLE public.gbp_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gbp posts"
    ON public.gbp_posts FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert gbp posts"
    ON public.gbp_posts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update gbp posts"
    ON public.gbp_posts FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete gbp posts"
    ON public.gbp_posts FOR DELETE
    USING (auth.role() = 'authenticated');
