-- Add error handling and rerun columns to content_requests

ALTER TABLE public.content_requests
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS improvement_notes text;

-- Add index on status for faster querying of pending/error states
CREATE INDEX IF NOT EXISTS idx_content_requests_status ON public.content_requests(status);
