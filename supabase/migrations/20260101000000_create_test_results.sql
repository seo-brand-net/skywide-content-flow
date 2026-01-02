-- Create test_results table
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    path_id TEXT NOT NULL,
    article_title TEXT,
    status TEXT DEFAULT 'pending',
    score INTEGER,
    audit_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster lookups during polling
CREATE INDEX IF NOT EXISTS idx_test_results_request_id ON public.test_results(request_id);

-- Enable RLS
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own test results"
ON public.test_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test results"
ON public.test_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test results"
ON public.test_results FOR UPDATE
USING (auth.uid() = user_id);

-- Allow service role (n8n callback) to update everything
CREATE POLICY "Service role can do everything"
ON public.test_results
FOR ALL
USING (true)
WITH CHECK (true);
