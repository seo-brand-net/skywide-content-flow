-- GBP Automation: gbp_locations child table
-- One client can have many locations (e.g. Suncoast Skin Solutions = 10 Florida locations).
-- sheet_tab_name bridges the existing Google Sheets tab structure during n8n transition.

CREATE TABLE public.gbp_locations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gbp_client_id   uuid NOT NULL REFERENCES public.gbp_clients(id) ON DELETE CASCADE,
    location_name   text NOT NULL,        -- "Largo", "Tampa", "Boca Raton"
    city            text NOT NULL,
    state           text NOT NULL,
    sheet_tab_name  text,                 -- maps to existing Sheets tab (e.g. "Largo")
    is_active       boolean DEFAULT true,
    created_at      timestamptz DEFAULT now()
);

-- RLS: mirror parent table pattern
ALTER TABLE public.gbp_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gbp locations"
    ON public.gbp_locations FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert gbp locations"
    ON public.gbp_locations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update gbp locations"
    ON public.gbp_locations FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete gbp locations"
    ON public.gbp_locations FOR DELETE
    USING (auth.role() = 'authenticated');
