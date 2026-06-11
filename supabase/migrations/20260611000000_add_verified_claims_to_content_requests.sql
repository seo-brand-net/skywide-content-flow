-- Add verified_claims column to content_requests table
ALTER TABLE public.content_requests 
ADD COLUMN IF NOT EXISTS verified_claims text;
