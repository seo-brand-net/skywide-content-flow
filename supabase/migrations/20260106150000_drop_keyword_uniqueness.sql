-- Migration to drop unique keyword constraint to allow for history tracking
-- This enables a "History Log" strategy where every run is a new row.

ALTER TABLE public.workbook_rows 
DROP CONSTRAINT IF EXISTS workbook_rows_client_id_primary_keyword_key;

-- Note: We keep the Primary Key 'id' as the unique identifier for specific attempts.
