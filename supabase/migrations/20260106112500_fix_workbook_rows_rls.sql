-- Fix RLS for workbook_rows to allow service_role access
-- This ensures that direct syncs from Apps Script (using Service Role key) are authorized

CREATE POLICY "Service role can manage workbook_rows"
    ON public.workbook_rows
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Also ensure anon has read access if needed for dashboard previews
-- (Optional, but aligns with other project patterns if they use anon for read)
-- CREATE POLICY "Allow anon to read workbook_rows"
--     ON public.workbook_rows FOR SELECT
--     TO anon
--     USING (true);
