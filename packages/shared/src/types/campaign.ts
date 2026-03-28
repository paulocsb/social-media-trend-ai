import { z } from 'zod';

export const CampaignSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  color: z.string().default('#6366f1'),
  active: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

export const CreateCampaignSchema = CampaignSchema.pick({ name: true, description: true, color: true });
export type CreateCampaign = z.infer<typeof CreateCampaignSchema>;
