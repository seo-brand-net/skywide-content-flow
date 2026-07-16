-- ═══════════════════════════════════════════════════════════════════════════
-- Best-effort recovery for clients.workbook_url on Content Briefs clients
-- that have it null.
--
-- IMPORTANT: run this AFTER 20260711000000_unify_clients_table.sql — it reads
-- clients.indexing_workbook_url, which that migration is what backfills from
-- the old indexing_clients table in the first place.
--
-- There is no other table in this database, past or present, that has ever
-- held Content Briefs' workbook_url/folder_url — `clients` (created
-- 2025-12-20) has always been the sole home for it, and it's simply been
-- left blank for most clients. This migration does NOT restore lost data;
-- it makes one educated, non-destructive guess: clients often run both
-- Indexing and Content Briefs off the SAME Google Sheet, just different tabs
-- (the app already defaults to looking for an 'Indexing Automation' tab and
-- a 'Content Brief Automation' tab within one workbook). Where a client has
-- an indexing_workbook_url but no content workbook_url, we copy it over as
-- a starting point — someone should still verify it's the right sheet.
--
-- Purely additive: only ever fills a NULL workbook_url, never overwrites an
-- existing value. Safe to re-run.
--
-- Does NOT touch folder_url/folder_id — nothing anywhere in this database
-- has ever stored a Drive folder for these clients, so there is genuinely
-- nothing to recover it from. Those need manual entry per client via the
-- Clients page regardless of this migration.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE public.clients c
SET workbook_url = c.indexing_workbook_url
WHERE c.content_enabled = true
  AND c.workbook_url IS NULL
  AND c.indexing_workbook_url IS NOT NULL;

-- ─── Summary — printed to the SQL editor's output before COMMIT ─────────────

DO $$
DECLARE
  v_still_missing int;
  v_missing_folder int;
  r RECORD;
BEGIN
  RAISE NOTICE '=== Content workbook_url recovery summary ===';
  RAISE NOTICE 'Guessed workbook_url from indexing_workbook_url for these client(s) — VERIFY, may not be the right sheet:';

  FOR r IN
    SELECT name FROM public.clients
    WHERE content_enabled = true
      AND workbook_url IS NOT NULL
      AND workbook_url = indexing_workbook_url
    ORDER BY name
  LOOP
    RAISE NOTICE '  - %', r.name;
  END LOOP;

  SELECT count(*) INTO v_still_missing
  FROM public.clients
  WHERE content_enabled = true AND workbook_url IS NULL;

  SELECT count(*) INTO v_missing_folder
  FROM public.clients
  WHERE content_enabled = true AND folder_url IS NULL;

  RAISE NOTICE 'Still missing workbook_url (no indexing workbook to borrow from): % client(s) — needs manual entry', v_still_missing;
  RAISE NOTICE 'Missing folder_url (never recoverable from this database): % client(s) — needs manual entry, always', v_missing_folder;
END $$;

COMMIT;
