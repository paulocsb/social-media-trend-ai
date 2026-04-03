-- ----------------------------------------------------------------
-- Analysis queue — posts staged for next AI analysis, per campaign
-- Populated after each collection run; posts can be excluded by the user.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analysis_queue (
  campaign_id UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  post_id     TEXT        NOT NULL,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, post_id)
);

CREATE INDEX idx_analysis_queue_campaign ON public.analysis_queue (campaign_id, added_at DESC);

ALTER TABLE public.analysis_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_queue: via campaign"
  ON public.analysis_queue FOR ALL
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));
