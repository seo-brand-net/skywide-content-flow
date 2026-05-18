-- Add sheet_id to gbp_clients so n8n knows which Google Spreadsheet to read topics from.
-- This is the spreadsheet ID from the URL: docs.google.com/spreadsheets/d/<sheet_id>/edit
-- Also add sheet_tab_name for the Topics tab (defaults to 'Topics').

ALTER TABLE public.gbp_clients
    ADD COLUMN IF NOT EXISTS sheet_id        text,
    ADD COLUMN IF NOT EXISTS topics_tab_name text DEFAULT 'Topics';
