-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    workbook_url text,
    folder_url text,
    folder_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all authenticated users to read/write)
-- In a real prod app, you might want to restrict this by role or user_id
CREATE POLICY "Allow all authenticated users to read clients"
    ON public.clients FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow all authenticated users to insert clients"
    ON public.clients FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update clients"
    ON public.clients FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
