import { z } from 'zod';

export const AlertSchema = z.object({
  id: z.string(),
  userId: z.string(),
  hashtag: z.string(),
  threshold: z.number(),
  active: z.boolean().default(true),
  createdAt: z.coerce.date(),
});

export type Alert = z.infer<typeof AlertSchema>;

export const TrendSpikeEventSchema = z.object({
  hashtag: z.string(),
  trendScore: z.number(),
  delta: z.number(),
  detectedAt: z.coerce.date(),
});

export type TrendSpikeEvent = z.infer<typeof TrendSpikeEventSchema>;
