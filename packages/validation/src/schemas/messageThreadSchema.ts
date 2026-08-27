import { z } from 'zod';

export const messageThreadTypeEnum = z.enum(['direct', 'project', 'deal']);

/**
 * Canonical schema for `/messageThreads/{threadId}`.
 */
export const messageThreadSchema = z.object({
  id: z.string().min(1),
  participantUids: z.array(z.string().min(1)).min(2),
  participantKey: z.string().min(1),
  type: messageThreadTypeEnum,
  projectId: z.string().optional(),
  organizationId: z.string().optional(),
  subject: z.string().optional(),
  lastMessagePreview: z.string().optional(),
  lastMessageAt: z.any().optional(),
  lastSenderUid: z.string().optional(),
  unreadCounts: z.record(z.string(), z.number().int().nonnegative()).optional(),
  createdBy: z.string().min(1),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export type MessageThread = z.infer<typeof messageThreadSchema>;

