-- Add brief_data column to workbook_rows
ALTER TABLE public.workbook_rows 
ADD COLUMN IF NOT EXISTS brief_data JSONB;

-- Update comment
COMMENT ON COLUMN public.workbook_rows.brief_data IS 'Full JSON structured data of the generated content brief';
