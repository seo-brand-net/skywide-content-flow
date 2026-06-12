-- Add sitemap_url back to gbp_clients to allow custom target links per client
ALTER TABLE public.gbp_clients ADD COLUMN sitemap_url text;
