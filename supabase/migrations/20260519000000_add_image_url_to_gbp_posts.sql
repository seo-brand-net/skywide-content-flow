-- Add image_url to gbp_posts
ALTER TABLE public.gbp_posts ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for GBP images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gbp_images', 'gbp_images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for the bucket
-- Allow public read access
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'gbp_images');

-- Allow authenticated users to upload/update/delete
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'gbp_images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'gbp_images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'gbp_images' AND auth.role() = 'authenticated');

-- Also allow service role to upload (since the Next.js API will use the service role key)
CREATE POLICY "Service role can bypass RLS for gbp_images"
ON storage.objects FOR ALL
USING (bucket_id = 'gbp_images' AND auth.role() = 'service_role');
