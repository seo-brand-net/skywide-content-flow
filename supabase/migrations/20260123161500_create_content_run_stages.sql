-- Individual stage execution tracking
-- Tracks each node/stage in the n8n workflow
CREATE TABLE public.content_run_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid REFERENCES public.content_runs(id) ON DELETE CASCADE NOT NULL,
  stage_name text NOT NULL, -- Node name from n8n
  stage_order integer NOT NULL, -- Execution order (1-19)
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  output_text text, -- Content output from this stage
  output_metadata jsonb, -- Scores, suggestions, etc. from Claude
  error_message text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_ms integer, -- Execution time in milliseconds
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.content_run_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view stages for their runs
CREATE POLICY "Users can view stages for their runs" ON public.content_run_stages
  FOR SELECT USING (
    run_id IN (
      SELECT id FROM public.content_runs cr
      WHERE auth.uid() IN (
        SELECT user_id FROM public.content_requests 
        WHERE id = cr.content_request_id
      ) OR public.is_admin_user()
    )
  );

-- Indexes for performance
CREATE INDEX idx_run_stages_run_id ON public.content_run_stages(run_id);
CREATE INDEX idx_run_stages_status ON public.content_run_stages(status);
CREATE INDEX idx_run_stages_order ON public.content_run_stages(run_id, stage_order);

-- Unique constraint to prevent duplicate stage entries per run
CREATE UNIQUE INDEX idx_run_stages_unique ON public.content_run_stages(run_id, stage_name);
