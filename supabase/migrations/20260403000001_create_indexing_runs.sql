-- Create indexing_runs table
-- Full audit trail for every indexing operation (manual or scheduled).

CREATE TABLE public.indexing_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    indexing_client_id uuid REFERENCES public.indexing_clients(id) ON DELETE CASCADE,
    triggered_by text DEFAULT 'manual',  -- 'manual' | 'scheduled'
    status text DEFAULT 'pending',       -- 'pending' | 'success' | 'error'
    google_summary jsonb,                -- { new_urls, existing_urls, submitted, errors, rate_limited }
    bing_summary jsonb,                  -- { submitted, errors } or null if bing_site_url is NULL
    error_message text,
    error_details jsonb,
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Index for fast client run history queries
CREATE INDEX indexing_runs_client_id_idx ON public.indexing_runs (indexing_client_id, created_at DESC);

-- RLS: authenticated users can read/write all runs
ALTER TABLE public.indexing_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view indexing runs"
    ON public.indexing_runs FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert indexing runs"
    ON public.indexing_runs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update indexing runs"
    ON public.indexing_runs FOR UPDATE
    USING (auth.role() = 'authenticated');
