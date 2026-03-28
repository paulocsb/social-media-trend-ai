import { z } from 'zod';

export const NormalizedPostSchema = z.object({
  id: z.string(),
  source: z.enum(['graph-api', 'apify']),
  hashtags: z.array(z.string()),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  views: z.number().int().nonnegative(),
  mediaType: z.enum(['IMAGE', 'VIDEO', 'REEL', 'CAROUSEL']),
  authorHandle: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
  collectedAt: z.coerce.date(),
  thumbnailUrl: z.string().url().optional(),
  permalink: z.string().url().optional(),
  caption: z.string().optional(),
});

export type NormalizedPost = z.infer<typeof NormalizedPostSchema>;

export const ScoredPostSchema = NormalizedPostSchema.extend({
  engagementRate: z.number(),
  trendScore: z.number(),
  velocityScore: z.number(),
});

export type ScoredPost = z.infer<typeof ScoredPostSchema>;

export const RawPostSchema = z.object({
  id: z.string(),
  source: z.enum(['graph-api', 'apify']),
  raw: z.record(z.unknown()),
  collectedAt: z.coerce.date(),
});

export type RawPost = z.infer<typeof RawPostSchema>;
