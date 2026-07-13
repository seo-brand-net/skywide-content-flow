-- ═══════════════════════════════════════════════════════════════════════════
-- Unify clients: make `clients` / `client_locations` the single source of
-- truth for GBP + Indexing + Content, instead of three parallel tables.
--
-- This migration is purely additive/backfill — it does NOT drop gbp_clients,
-- gbp_locations, or indexing_clients. Those stay intact (and the live app
-- keeps reading them) until application code is repointed in a follow-up
-- deploy. Dropping them is a deliberate later step once the new read paths
-- are verified in production.
--
-- RUN ORDER MATTERS: apply this only after the app code from this branch is
-- already deployed and live. Running it against the currently-deployed (old)
-- code creates a window where GBP topic/post writes will silently fail
-- (FK mismatch) until the new code ships. Deploying the new code first is
-- safe on its own — client dropdowns just show empty until this runs.
--
-- Wrapped in a transaction: if anything below errors, everything rolls back
-- and the database is left exactly as it was — nothing is left half-migrated.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Extend `clients` with GBP + Indexing config fields ──────────────────
-- (sitemap_url, industry, key_selling_point already exist and are reused as-is)

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS gbp_sheet_id          text,
  ADD COLUMN IF NOT EXISTS gbp_topics_tab_name   text DEFAULT 'Topics',
  ADD COLUMN IF NOT EXISTS indexing_workbook_url text,
  ADD COLUMN IF NOT EXISTS indexing_tab_name     text DEFAULT 'Indexing Automation',
  ADD COLUMN IF NOT EXISTS indexing_gsc_property text,
  ADD COLUMN IF NOT EXISTS indexing_bing_site_url text,
  ADD COLUMN IF NOT EXISTS indexing_last_run_at  timestamptz;

-- ─── 2. Backfill `clients` from `gbp_clients` (matched by name, case-insensitive) ──

-- 2a. Update existing clients rows that already match a gbp_clients name
UPDATE public.clients c
SET
  gbp_enabled          = true,
  sitemap_url          = COALESCE(c.sitemap_url, g.sitemap_url),
  industry             = COALESCE(c.industry, g.industry),
  key_selling_point    = COALESCE(c.key_selling_point, g.key_selling_point),
  gbp_sheet_id          = g.sheet_id,
  gbp_topics_tab_name  = COALESCE(g.topics_tab_name, 'Topics')
FROM public.gbp_clients g
WHERE lower(c.name) = lower(g.name);

-- 2b. Insert gbp_clients that have no matching clients row
INSERT INTO public.clients (name, industry, sitemap_url, key_selling_point, gbp_sheet_id, gbp_topics_tab_name, gbp_enabled, content_enabled, indexing_enabled)
SELECT g.name, g.industry, g.sitemap_url, g.key_selling_point, g.sheet_id, COALESCE(g.topics_tab_name, 'Topics'), true, false, false
FROM public.gbp_clients g
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE lower(c.name) = lower(g.name));

-- ─── 3. Backfill `clients` from `indexing_clients` (matched by name) ────────

-- 3a. Update existing clients rows that already match an indexing_clients name
UPDATE public.clients c
SET
  indexing_enabled       = true,
  indexing_workbook_url  = i.workbook_url,
  indexing_tab_name      = COALESCE(i.tab_name, 'Indexing Automation'),
  indexing_gsc_property  = i.gsc_property,
  indexing_bing_site_url = i.bing_site_url,
  indexing_last_run_at   = i.last_run_at
FROM public.indexing_clients i
WHERE lower(c.name) = lower(i.name);

-- 3b. Insert indexing_clients that have no matching clients row
INSERT INTO public.clients (name, indexing_enabled, indexing_workbook_url, indexing_tab_name, indexing_gsc_property, indexing_bing_site_url, indexing_last_run_at, content_enabled, gbp_enabled)
SELECT i.name, true, i.workbook_url, COALESCE(i.tab_name, 'Indexing Automation'), i.gsc_property, i.bing_site_url, i.last_run_at, false, false
FROM public.indexing_clients i
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE lower(c.name) = lower(i.name));

-- ─── 3c. Backfill `clients` from distinct `content_requests.client_name` ────
-- Content Briefs has historically taken client_name as free text, so most real
-- clients (~70+) likely only exist as strings on content_requests, never as a
-- clients row. This reconciles both directions: existing rows (e.g. created via
-- the GBP/Indexing backfill above) get content_enabled flipped on if they have
-- content history, and genuinely new names get their own client row.

-- 3c-i. Flip content_enabled on for any existing client with content history
UPDATE public.clients c
SET content_enabled = true
WHERE c.content_enabled = false
  AND EXISTS (
    SELECT 1 FROM public.content_requests req
    WHERE lower(trim(req.client_name)) = lower(c.name)
  );

-- 3c-ii. Insert client names that only ever existed as free text on content_requests.
-- DISTINCT ON + lower(trim(...)) collapses case/whitespace variants of the same
-- name (e.g. "Align PEO" vs "align peo ") down to one canonical row.
WITH distinct_content_clients AS (
  SELECT DISTINCT ON (lower(trim(client_name))) trim(client_name) AS name
  FROM public.content_requests
  WHERE trim(client_name) <> ''
  ORDER BY lower(trim(client_name)), client_name
)
INSERT INTO public.clients (name, content_enabled, gbp_enabled, indexing_enabled)
SELECT dc.name, true, false, false
FROM distinct_content_clients dc
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE lower(c.name) = lower(dc.name));

-- ─── 4. Backfill `client_locations` from `gbp_locations` ────────────────────
-- Only insert locations that don't already exist for that client+name (idempotent re-run safety).

INSERT INTO public.client_locations (client_id, location_name, city, state, sheet_tab_name, is_active)
SELECT c.id, gl.location_name, gl.city, gl.state, gl.sheet_tab_name, gl.is_active
FROM public.gbp_locations gl
JOIN public.gbp_clients g ON g.id = gl.gbp_client_id
JOIN public.clients c ON lower(c.name) = lower(g.name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_locations cl
  WHERE cl.client_id = c.id AND cl.location_name = gl.location_name
);

-- ─── 5. Remap FK values on gbp_topics / gbp_posts / indexing_runs, then repoint FKs ──

-- 5a. gbp_topics: add new columns holding the remapped IDs
ALTER TABLE public.gbp_topics
  ADD COLUMN IF NOT EXISTS client_id_new   uuid,
  ADD COLUMN IF NOT EXISTS location_id_new uuid;

UPDATE public.gbp_topics t
SET client_id_new = c.id
FROM public.gbp_clients g
JOIN public.clients c ON lower(c.name) = lower(g.name)
WHERE t.gbp_client_id = g.id;

UPDATE public.gbp_topics t
SET location_id_new = cl.id
FROM public.gbp_locations gl
JOIN public.gbp_clients g ON g.id = gl.gbp_client_id
JOIN public.clients c ON lower(c.name) = lower(g.name)
JOIN public.client_locations cl ON cl.client_id = c.id AND cl.location_name = gl.location_name
WHERE t.location_id = gl.id;

ALTER TABLE public.gbp_topics DROP CONSTRAINT IF EXISTS gbp_topics_gbp_client_id_fkey;
ALTER TABLE public.gbp_topics DROP CONSTRAINT IF EXISTS gbp_topics_location_id_fkey;
ALTER TABLE public.gbp_topics DROP COLUMN gbp_client_id;
ALTER TABLE public.gbp_topics DROP COLUMN location_id;
ALTER TABLE public.gbp_topics RENAME COLUMN client_id_new TO gbp_client_id;
ALTER TABLE public.gbp_topics RENAME COLUMN location_id_new TO location_id;
ALTER TABLE public.gbp_topics ALTER COLUMN gbp_client_id SET NOT NULL;
ALTER TABLE public.gbp_topics ADD CONSTRAINT gbp_topics_gbp_client_id_fkey
  FOREIGN KEY (gbp_client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.gbp_topics ADD CONSTRAINT gbp_topics_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES public.client_locations(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS gbp_topics_client_status_idx;
CREATE INDEX gbp_topics_client_status_idx ON public.gbp_topics(gbp_client_id, status);

-- 5b. gbp_posts: same remap
ALTER TABLE public.gbp_posts
  ADD COLUMN IF NOT EXISTS client_id_new   uuid,
  ADD COLUMN IF NOT EXISTS location_id_new uuid;

UPDATE public.gbp_posts p
SET client_id_new = c.id
FROM public.gbp_clients g
JOIN public.clients c ON lower(c.name) = lower(g.name)
WHERE p.gbp_client_id = g.id;

UPDATE public.gbp_posts p
SET location_id_new = cl.id
FROM public.gbp_locations gl
JOIN public.gbp_clients g ON g.id = gl.gbp_client_id
JOIN public.clients c ON lower(c.name) = lower(g.name)
JOIN public.client_locations cl ON cl.client_id = c.id AND cl.location_name = gl.location_name
WHERE p.location_id = gl.id;

ALTER TABLE public.gbp_posts DROP CONSTRAINT IF EXISTS gbp_posts_gbp_client_id_fkey;
ALTER TABLE public.gbp_posts DROP CONSTRAINT IF EXISTS gbp_posts_location_id_fkey;
ALTER TABLE public.gbp_posts DROP COLUMN gbp_client_id;
ALTER TABLE public.gbp_posts DROP COLUMN location_id;
ALTER TABLE public.gbp_posts RENAME COLUMN client_id_new TO gbp_client_id;
ALTER TABLE public.gbp_posts RENAME COLUMN location_id_new TO location_id;
ALTER TABLE public.gbp_posts ALTER COLUMN gbp_client_id SET NOT NULL;
ALTER TABLE public.gbp_posts ADD CONSTRAINT gbp_posts_gbp_client_id_fkey
  FOREIGN KEY (gbp_client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.gbp_posts ADD CONSTRAINT gbp_posts_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES public.client_locations(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS gbp_posts_client_status_idx;
CREATE INDEX gbp_posts_client_status_idx ON public.gbp_posts(gbp_client_id, status);

-- 5c. indexing_runs: remap indexing_client_id -> clients.id
ALTER TABLE public.indexing_runs
  ADD COLUMN IF NOT EXISTS client_id_new uuid;

UPDATE public.indexing_runs r
SET client_id_new = c.id
FROM public.indexing_clients i
JOIN public.clients c ON lower(c.name) = lower(i.name)
WHERE r.indexing_client_id = i.id;

ALTER TABLE public.indexing_runs DROP CONSTRAINT IF EXISTS indexing_runs_indexing_client_id_fkey;
ALTER TABLE public.indexing_runs DROP COLUMN indexing_client_id;
ALTER TABLE public.indexing_runs RENAME COLUMN client_id_new TO indexing_client_id;
ALTER TABLE public.indexing_runs ALTER COLUMN indexing_client_id SET NOT NULL;
ALTER TABLE public.indexing_runs ADD CONSTRAINT indexing_runs_indexing_client_id_fkey
  FOREIGN KEY (indexing_client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- ─── 6. Standardize RLS on clients / client_locations via is_admin_user() ───

DROP POLICY IF EXISTS "Allow all authenticated users to read clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all authenticated users to insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all authenticated users to update clients" ON public.clients;

CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can manage client_locations" ON public.client_locations;

CREATE POLICY "Authenticated users can view client_locations"
  ON public.client_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage client_locations"
  ON public.client_locations FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ─── 7. content_requests gets a real client_id ───────────────────────────────

ALTER TABLE public.content_requests
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_requests_client_id ON public.content_requests(client_id);

UPDATE public.content_requests req
SET client_id = c.id
FROM public.clients c
WHERE lower(req.client_name) = lower(c.name)
  AND req.client_id IS NULL;

COMMIT;
