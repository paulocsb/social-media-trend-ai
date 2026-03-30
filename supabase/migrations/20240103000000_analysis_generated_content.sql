ALTER TABLE public.ai_analyses
  ADD COLUMN IF NOT EXISTS generated_content JSONB;
