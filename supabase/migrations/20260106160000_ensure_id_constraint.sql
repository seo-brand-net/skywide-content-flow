-- Safety migration to ensure 'id' is the primary key and has a unique constraint.
-- This is required for the 'History Log' strategy and ID-based upserts.

DO $$ 
BEGIN
    -- Only add PK if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'workbook_rows' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE public.workbook_rows ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Also ensure a unique index exists on 'id' specifically for PostgREST
CREATE UNIQUE INDEX IF NOT EXISTS workbook_rows_id_idx ON public.workbook_rows (id);
