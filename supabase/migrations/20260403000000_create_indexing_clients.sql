-- Create indexing_clients table
-- Separate from the existing 'clients' table to keep features decoupled.
-- Only ~5 clients use indexing (vs 70+ for Content Briefs).

CREATE TABLE public.indexing_clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    workbook_url text NOT NULL,
    tab_name text NOT NULL DEFAULT 'Indexing Automation',
    gsc_property text NOT NULL,
    bing_site_url text,              -- NULL = skip Bing for this client
    is_active boolean DEFAULT true,  -- Pause without deleting
    last_run_at timestamptz,         -- For 14-day cron filtering
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS: mirror the clients table pattern — all authenticated users can CRUD
ALTER TABLE public.indexing_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view indexing clients"
    ON public.indexing_clients FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert indexing clients"
    ON public.indexing_clients FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update indexing clients"
    ON public.indexing_clients FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete indexing clients"
    ON public.indexing_clients FOR DELETE
    USING (auth.role() = 'authenticated');

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.update_indexing_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER indexing_clients_updated_at
    BEFORE UPDATE ON public.indexing_clients
    FOR EACH ROW EXECUTE FUNCTION public.update_indexing_clients_updated_at();
