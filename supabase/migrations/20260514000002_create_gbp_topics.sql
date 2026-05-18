-- GBP Automation: gbp_topics table
-- Replaces the "Topics" Google Sheets tab per client.
-- n8n polls for rows with status = 'NEW', processes them, then sets status = 'DONE'.
-- Skywide UI sets status = 'IN_PROGRESS' when "Generate Posts" is triggered.

CREATE TABLE public.gbp_topics (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gbp_client_id   uuid NOT NULL REFERENCES public.gbp_clients(id) ON DELETE CASCADE,
    location_id     uuid REFERENCES public.gbp_locations(id) ON DELETE SET NULL,
    topic           text NOT NULL,
    status          text NOT NULL DEFAULT 'NEW',  -- NEW | IN_PROGRESS | DONE
    created_at      timestamptz DEFAULT now()
);

-- Index for n8n polling: fast lookup by client + status
CREATE INDEX gbp_topics_client_status_idx ON public.gbp_topics(gbp_client_id, status);

-- RLS
ALTER TABLE public.gbp_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gbp topics"
    ON public.gbp_topics FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert gbp topics"
    ON public.gbp_topics FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update gbp topics"
    ON public.gbp_topics FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete gbp topics"
    ON public.gbp_topics FOR DELETE
    USING (auth.role() = 'authenticated');
