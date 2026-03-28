import { z } from 'zod';

export const AlertSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  user_id: z.string().uuid(),
  hashtag: z.string(),
  threshold: z.number(),
  active: z.boolean().default(true),
  created_at: z.string(),
});

export type Alert = z.infer<typeof AlertSchema>;
