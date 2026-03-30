-- Link scored posts back to the collection run that produced them.
-- ON DELETE SET NULL: deleting a run keeps the posts (orphaned posts
-- still show in the Home trending view, scoped by collected_at window).
ALTER TABLE public.scored_posts
  ADD COLUMN IF NOT EXISTS run_id uuid REFERENCES public.collection_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS scored_posts_run_id_idx ON public.scored_posts(run_id);

-- Store a quick top-hashtags summary on the run for display in History
-- without requiring a join to scored_posts.
ALTER TABLE public.collection_runs
  ADD COLUMN IF NOT EXISTS top_hashtags jsonb;
