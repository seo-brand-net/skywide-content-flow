-- GBP Automation: standalone gbp_clients table
-- Mirrors the indexing_clients pattern — fully decoupled from the main clients table.
-- Each GBP client has the config n8n needs: sitemap URL, industry, key selling point.

CREATE TABLE public.gbp_clients (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name              text NOT NULL UNIQUE,
    industry          text NOT NULL,
    sitemap_url       text NOT NULL,         -- n8n link-picker: fetches + parses this sitemap
    key_selling_point text,                  -- replaces hardcoded "Edit Fields" node in n8n
    is_active         boolean DEFAULT true,  -- pause without deleting
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

-- RLS: mirror indexing_clients — all authenticated users can CRUD
ALTER TABLE public.gbp_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gbp clients"
    ON public.gbp_clients FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert gbp clients"
    ON public.gbp_clients FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update gbp clients"
    ON public.gbp_clients FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete gbp clients"
    ON public.gbp_clients FOR DELETE
    USING (auth.role() = 'authenticated');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_gbp_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gbp_clients_updated_at
    BEFORE UPDATE ON public.gbp_clients
    FOR EACH ROW EXECUTE FUNCTION public.update_gbp_clients_updated_at();
