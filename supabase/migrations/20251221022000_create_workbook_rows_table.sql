-- Create workbook_rows table to mirror spreadsheet data
CREATE TABLE IF NOT EXISTS public.workbook_rows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    url text,
    url_type text DEFAULT 'new',
    page_type text DEFAULT 'blog page',
    primary_keyword text NOT NULL,
    secondary_keyword text,
    longtail_keywords text,
    location text DEFAULT 'Global',
    intent text DEFAULT 'informational',
    status text DEFAULT 'NEW',
    brief_url text,
    run_id text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(client_id, primary_keyword)
);

-- Enable RLS
ALTER TABLE public.workbook_rows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all authenticated users to read workbook_rows"
    ON public.workbook_rows FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow all authenticated users to insert workbook_rows"
    ON public.workbook_rows FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update workbook_rows"
    ON public.workbook_rows FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to delete workbook_rows"
    ON public.workbook_rows FOR DELETE
    TO authenticated
    USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_workbook_rows_updated_at
    BEFORE UPDATE ON public.workbook_rows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
