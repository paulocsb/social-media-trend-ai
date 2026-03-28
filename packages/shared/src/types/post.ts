import { z } from 'zod';

export const ScoredPostSchema = z.object({
  id: z.string(),
  campaign_id: z.string().uuid(),
  source: z.string(),
  hashtags: z.array(z.string()),
  media_type: z.enum(['IMAGE', 'VIDEO', 'REEL', 'CAROUSEL']),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  views: z.number().int().nonnegative(),
  engagement_rate: z.number(),
  trend_score: z.number(),
  velocity_score: z.number(),
  thumbnail_url: z.string().nullable(),
  permalink: z.string().nullable(),
  caption: z.string().nullable(),
  author_handle: z.string().nullable(),
  published_at: z.string().nullable(),
  collected_at: z.string(),
});

export type ScoredPost = z.infer<typeof ScoredPostSchema>;
