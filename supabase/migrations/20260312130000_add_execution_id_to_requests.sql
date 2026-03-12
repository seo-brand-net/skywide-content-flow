-- Add n8n_execution_id directly to content_requests to avoid dependency on content_runs table
ALTER TABLE public.content_requests 
ADD COLUMN IF NOT EXISTS n8n_execution_id text;

-- Add index for lookup
CREATE INDEX IF NOT EXISTS idx_content_requests_n8n_id ON public.content_requests(n8n_execution_id);

-- Add comment
COMMENT ON COLUMN public.content_requests.n8n_execution_id IS 'The current or last n8n execution ID for this request, used for retries';
