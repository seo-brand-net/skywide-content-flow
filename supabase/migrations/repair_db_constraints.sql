-- DANGEROUS REPAIR SCRIPT: Clean workbook_rows and Force ID Primary Key
-- Run this in your Supabase SQL Editor if you are getting "no unique constraint matching" errors.

BEGIN;

-- 1. Identify and remove any duplicate IDs that might prevent PK creation
-- (Keeps one of each duplicate ID)
DELETE FROM public.workbook_rows a
USING public.workbook_rows b
WHERE a.ctid < b.ctid AND a.id = b.id;

-- 2. If 'id' is null, assign a random UUID to ensure we can set a Primary Key
UPDATE public.workbook_rows SET id = gen_random_uuid() WHERE id IS NULL;

-- 3. Drop existing constraints that might be blocking or outdated
ALTER TABLE public.workbook_rows DROP CONSTRAINT IF EXISTS workbook_rows_id_pkey;
ALTER TABLE public.workbook_rows DROP CONSTRAINT IF EXISTS workbook_rows_pkey;
-- Drop the old keyword constraint if it still exists
ALTER TABLE public.workbook_rows DROP CONSTRAINT IF EXISTS workbook_rows_client_id_primary_keyword_key;

-- 4. Explicitly make 'id' THE Primary Key
ALTER TABLE public.workbook_rows ADD PRIMARY KEY (id);

-- 5. Ensure a specific unique index exists for PostgREST
CREATE UNIQUE INDEX IF NOT EXISTS workbook_rows_id_postgrest_idx ON public.workbook_rows (id);

COMMIT;
