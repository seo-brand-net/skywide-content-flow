-- Add current_run_id to content_requests for quick lookup
ALTER TABLE public.content_requests 
  ADD COLUMN IF NOT EXISTS current_run_id uuid REFERENCES public.content_runs(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_content_requests_current_run ON public.content_requests(current_run_id);

-- Add comment for documentation
COMMENT ON COLUMN public.content_requests.current_run_id IS 'Reference to the currently active or most recent run for this content request';
