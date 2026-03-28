import { z } from 'zod';

export const HashtagSnapshotSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  hashtag: z.string(),
  trend_score: z.number(),
  post_count: z.number().int(),
  snapshotted_at: z.string(),
});

export type HashtagSnapshot = z.infer<typeof HashtagSnapshotSchema>;

export const HashtagLeaderboardEntrySchema = z.object({
  hashtag: z.string(),
  score: z.number(),
  rank: z.number().int(),
});

export type HashtagLeaderboardEntry = z.infer<typeof HashtagLeaderboardEntrySchema>;
