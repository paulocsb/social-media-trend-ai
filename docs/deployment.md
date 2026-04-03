# Production Deployment

## 1. Apply schema to remote

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

---

## 2. Set secrets

```bash
supabase secrets set APIFY_TOKEN=your_apify_token

# At least one AI provider to enable auto-analysis (optional)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# or
supabase secrets set OPENAI_API_KEY=sk-...

# Optional tuning
supabase secrets set MAX_POST_AGE_DAYS=2
supabase secrets set AI_SCORER_LIMIT=50
```

---

## 3. Deploy Edge Functions

```bash
supabase functions deploy collect
supabase functions deploy analysis
supabase functions deploy alerts
```

---

## 4. Deploy the dashboard

Set the following environment variables in your hosting provider (Vercel, Netlify, etc.):

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Then deploy the `packages/dashboard` directory as the project root.

---

## Trend score formula

Each post is scored 0–100. When an AI provider is configured, the AI refines scores for the top `AI_SCORER_LIMIT` posts. Otherwise the math formula is used for all posts:

```
score = velocity          × 25%   (engagement growth vs previous run)
      + engagement abs    × 35%   (log-normalised likes + comments×2 + shares×3)
      + engagement rate   × 25%   ((likes+comments)/views for reels)
      + recency           × 15%   (exponential decay, 24h half-life from publishedAt)
```

If AI scoring fails, math scores are used silently — collection is never blocked.
