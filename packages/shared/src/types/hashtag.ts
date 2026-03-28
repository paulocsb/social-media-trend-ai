import { z } from 'zod';

export const HashtagSnapshotSchema = z.object({
  hashtag: z.string(),
  trendScore: z.number(),
  snapshottedAt: z.coerce.date(),
});

export type HashtagSnapshot = z.infer<typeof HashtagSnapshotSchema>;

export const HashtagLeaderboardEntrySchema = z.object({
  hashtag: z.string(),
  score: z.number(),
  rank: z.number().int().positive(),
});

export type HashtagLeaderboardEntry = z.infer<typeof HashtagLeaderboardEntrySchema>;
