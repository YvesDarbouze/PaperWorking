import { z } from 'zod';

/**
 * Canonical schema for `/investorFollowers/{followerUid}_{targetUid}`.
 */
export const investorFollowerSchema = z.object({
  id: z.string().min(1),
  followerUid: z.string().min(1),
  targetUid: z.string().min(1),
  createdAt: z.any(),
});

export type InvestorFollower = z.infer<typeof investorFollowerSchema>;

