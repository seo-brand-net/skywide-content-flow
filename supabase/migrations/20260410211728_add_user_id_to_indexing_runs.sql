-- Add user_id to indexing_runs for tracking who triggered manual runs.
-- Cron/scheduled runs will have user_id = NULL (displayed as "Skywide" in the UI).

ALTER TABLE public.indexing_runs
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS indexing_runs_user_id_idx ON public.indexing_runs (user_id);
