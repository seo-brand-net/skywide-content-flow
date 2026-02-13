-- Create storage bucket for test exports (PDFs)
-- Run this via Supabase Dashboard SQL Editor or ensure storage extension is enabled

-- Create the bucket (public for shareable URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('test-exports', 'test-exports', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Users can upload PDFs to their own folder
CREATE POLICY "Users can upload PDFs" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'test-exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can read their own PDFs
CREATE POLICY "Users can read own PDFs" ON storage.objects
FOR SELECT
USING (
    bucket_id = 'test-exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Public read access (for sharing PDF URLs)
CREATE POLICY "Public read test-exports" ON storage.objects
FOR SELECT
USING (bucket_id = 'test-exports');
