import { z } from 'zod';

export const dealInvitationStatusEnum = z.enum([
  'pending',
  'accepted',
  'declined',
  'expired',
  'revoked',
]);

/**
 * Canonical schema for `/dealInvitations/{invitationId}`.
 */
export const dealInvitationSchema = z.object({
  id: z.string().min(1),
  dealListingId: z.string().min(1),
  projectId: z.string().min(1),
  inviterUid: z.string().min(1),
  inviteeEmail: z.string().email(),
  inviteeUid: z.string().optional(),
  token: z.string().min(1),
  status: dealInvitationStatusEnum,
  expiresAt: z.any(),
  acceptedAt: z.any().optional(),
  message: z.string().optional(),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export type DealInvitation = z.infer<typeof dealInvitationSchema>;

