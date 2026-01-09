-- CLEANUP SCRIPT: Remove duplicate workbook_rows entries
-- This keeps only the most recent entry for each client_id + primary_keyword combination
-- Run this in your Supabase SQL Editor

BEGIN;

-- Delete duplicate rows, keeping only the one with the most recent updated_at
DELETE FROM public.workbook_rows a
USING public.workbook_rows b
WHERE a.client_id = b.client_id 
  AND a.primary_keyword = b.primary_keyword
  AND a.updated_at < b.updated_at;

-- Alternative: If you want to keep the row with a brief_url (if it exists)
-- DELETE FROM public.workbook_rows a
-- USING public.workbook_rows b
-- WHERE a.client_id = b.client_id 
--   AND a.primary_keyword = b.primary_keyword
--   AND a.id != b.id
--   AND (a.brief_url IS NULL OR a.brief_url = '')
--   AND (b.brief_url IS NOT NULL AND b.brief_url != '');

COMMIT;

-- After running this, verify the cleanup:
-- SELECT client_id, primary_keyword, COUNT(*) 
-- FROM public.workbook_rows 
-- GROUP BY client_id, primary_keyword 
-- HAVING COUNT(*) > 1;
