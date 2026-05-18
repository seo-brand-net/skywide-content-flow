-- ═══════════════════════════════════════════════════════════════
-- GBP Clients & Locations Seed
-- Run this directly in Supabase SQL Editor
-- Safe to re-run (ON CONFLICT DO NOTHING on all inserts)
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Ensure new columns exist (idempotent)
ALTER TABLE public.gbp_clients
    ADD COLUMN IF NOT EXISTS sheet_id        text,
    ADD COLUMN IF NOT EXISTS topics_tab_name text DEFAULT 'Topics';

-- ─── Client 1: SEO Brand (single-location) ──────────────────────────────────

INSERT INTO public.gbp_clients (name, industry, sitemap_url, key_selling_point, sheet_id, topics_tab_name, is_active)
VALUES (
    'SEO Brand',
    'Digital Marketing Agency',
    'https://www.seobrand.com/page-sitemap.xml',
    'Results-driven SEO, PPC, web design, and digital marketing focused on qualified leads and measurable growth',
    '1xh0As6rrHv9WqCDqfgUyvJm8WCPvLf1Hks5RFf-Sf0A',
    'Topics',
    true
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.gbp_locations (gbp_client_id, location_name, city, state, sheet_tab_name, is_active)
SELECT id, 'Boca Raton', 'Boca Raton', 'FL', 'Topics', true
FROM public.gbp_clients
WHERE name = 'SEO Brand'
AND NOT EXISTS (
    SELECT 1 FROM public.gbp_locations l
    WHERE l.gbp_client_id = gbp_clients.id AND l.location_name = 'Boca Raton'
);

-- ─── Client 2: Suncoast Skin Solutions (multi-location) ─────────────────────

INSERT INTO public.gbp_clients (name, industry, sitemap_url, key_selling_point, sheet_id, topics_tab_name, is_active)
VALUES (
    'Suncoast Skin Solutions',
    'Dermatology',
    'https://suncoastskinsolutions.com/page-sitemap.xml',
    'Board-certified dermatology care across multiple Florida locations, specializing in skin cancer screenings, cosmetic treatments, and medical dermatology',
    'REPLACE_WITH_SUNCOAST_SHEET_ID',
    'Topics',
    true
)
ON CONFLICT (name) DO NOTHING;

-- Suncoast — 3 locations (Largo, Clearwater, St. Petersburg)
INSERT INTO public.gbp_locations (gbp_client_id, location_name, city, state, sheet_tab_name, is_active)
SELECT c.id, 'Largo', 'Largo', 'FL', 'Largo', true
FROM public.gbp_clients c
WHERE c.name = 'Suncoast Skin Solutions'
AND NOT EXISTS (
    SELECT 1 FROM public.gbp_locations l WHERE l.gbp_client_id = c.id AND l.location_name = 'Largo'
);

INSERT INTO public.gbp_locations (gbp_client_id, location_name, city, state, sheet_tab_name, is_active)
SELECT c.id, 'Clearwater', 'Clearwater', 'FL', 'Clearwater', true
FROM public.gbp_clients c
WHERE c.name = 'Suncoast Skin Solutions'
AND NOT EXISTS (
    SELECT 1 FROM public.gbp_locations l WHERE l.gbp_client_id = c.id AND l.location_name = 'Clearwater'
);

INSERT INTO public.gbp_locations (gbp_client_id, location_name, city, state, sheet_tab_name, is_active)
SELECT c.id, 'St. Petersburg', 'St. Petersburg', 'FL', 'St Petersburg', true
FROM public.gbp_clients c
WHERE c.name = 'Suncoast Skin Solutions'
AND NOT EXISTS (
    SELECT 1 FROM public.gbp_locations l WHERE l.gbp_client_id = c.id AND l.location_name = 'St. Petersburg'
);

-- ─── Verify ──────────────────────────────────────────────────────────────────
SELECT
    c.name AS client,
    c.is_active,
    COUNT(l.id) AS location_count,
    STRING_AGG(l.location_name, ', ' ORDER BY l.location_name) AS locations
FROM public.gbp_clients c
LEFT JOIN public.gbp_locations l ON l.gbp_client_id = c.id
GROUP BY c.name, c.is_active
ORDER BY c.name;
