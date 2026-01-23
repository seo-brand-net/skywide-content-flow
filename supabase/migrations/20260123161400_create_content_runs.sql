-- Content Runs tracking table
-- Tracks overall execution of content generation workflows
CREATE TABLE public.content_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_request_id uuid REFERENCES public.content_requests(id) ON DELETE CASCADE NOT NULL,
  n8n_execution_id text, -- n8n's execution ID if available
  status text DEFAULT 'running' CHECK (status IN ('running', 'paused', 'stopped', 'completed', 'failed')),
  current_stage text, -- Current node name from n8n workflow
  total_stages integer DEFAULT 19, -- Total number of trackable stages
  completed_stages integer DEFAULT 0,
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.content_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view own runs or admins view all
CREATE POLICY "Users can view own runs or admins view all" ON public.content_runs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.content_requests 
      WHERE id = content_request_id
    ) OR public.is_admin_user()
  );

-- Index for performance
CREATE INDEX idx_content_runs_request_id ON public.content_runs(content_request_id);
CREATE INDEX idx_content_runs_status ON public.content_runs(status);
CREATE INDEX idx_content_runs_created_at ON public.content_runs(created_at DESC);

-- Auto-update timestamp trigger
CREATE TRIGGER update_content_runs_updated_at
  BEFORE UPDATE ON public.content_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
