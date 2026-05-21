-- Remove sitemap_url from gbp_clients as it is now hardcoded in the n8n workflow
ALTER TABLE public.gbp_clients DROP COLUMN IF EXISTS sitemap_url;
