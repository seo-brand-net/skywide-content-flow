-- Add PDF URL columns to test_results table for storing generated PDF references
ALTER TABLE public.test_results
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;

-- Create index for faster PDF URL lookups
CREATE INDEX IF NOT EXISTS idx_test_results_pdf_url ON public.test_results(pdf_url);

-- Comment on columns
COMMENT ON COLUMN public.test_results.pdf_url IS 'Public URL to the generated PDF document in Supabase Storage';
COMMENT ON COLUMN public.test_results.pdf_storage_path IS 'Storage path for the PDF file (user_id/request_id.pdf)';
