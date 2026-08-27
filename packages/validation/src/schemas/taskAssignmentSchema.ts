import { z } from 'zod';

export const taskAssignmentStatusEnum = z.enum([
  'open',
  'in_progress',
  'blocked',
  'done',
  'cancelled',
]);

export const taskAssignmentPriorityEnum = z.enum([
  'low',
  'normal',
  'high',
  'urgent',
]);

/**
 * Canonical schema for `/taskAssignments/{taskId}`.
 */
export const taskAssignmentSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  organizationId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: taskAssignmentStatusEnum,
  priority: taskAssignmentPriorityEnum.optional(),
  assigneeId: z.string().min(1),
  assignerId: z.string().min(1),
  vendorId: z.string().optional(),
  vendorRequestId: z.string().optional(),
  dueAt: z.any().optional(),
  completedAt: z.any().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export type TaskAssignment = z.infer<typeof taskAssignmentSchema>;

