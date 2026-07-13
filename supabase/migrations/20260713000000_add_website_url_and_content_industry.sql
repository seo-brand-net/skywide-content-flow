-- ═══════════════════════════════════════════════════════════════════════════
-- Add a general client website_url (distinct from GBP's sitemap_url, which is
-- specifically the XML sitemap path) and a per-request industry snapshot on
-- content_requests, so the Content Request form can auto-populate both from
-- an existing client and pass industry through to the automation.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS website_url text;

ALTER TABLE public.content_requests
  ADD COLUMN IF NOT EXISTS industry text;

-- Backfill clients.website_url from the most recent historical
-- content_requests.client_website_url for that client, where available —
-- real data already exists here, no reason to leave it empty.
UPDATE public.clients c
SET website_url = sub.url
FROM (
  SELECT DISTINCT ON (client_id) client_id, client_website_url AS url
  FROM public.content_requests
  WHERE client_id IS NOT NULL
    AND client_website_url IS NOT NULL
    AND client_website_url <> ''
  ORDER BY client_id, created_at DESC
) sub
WHERE c.id = sub.client_id
  AND c.website_url IS NULL;

COMMIT;
