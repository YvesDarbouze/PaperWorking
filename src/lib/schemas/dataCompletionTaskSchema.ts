/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Data Completion Task Schema (Zod)
 *
 * Canonical Zod schema for `/dataCompletionTasks/{taskId}` collection.
 * Serves as the schema space for the user outreach engine.
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

export const dataCompletionTaskSchema = z.object({
  /** Unique ID for the task */
  taskId: z.string().min(1),

  /** Reference to the Project */
  projectId: z.string().min(1),

  /** Reference to the User who is assigned this task */
  assignedToUserId: z.string().min(1),

  /** Dot-separated path to the field that needs completion, e.g. "financials.purchasePrice" */
  fieldPath: z.string().min(1),

  /** How frequently this field is expected to be updated, e.g., "monthly", "weekly", "one-time" */
  expectedFrequency: z.enum(['monthly', 'one_off']),

  /** Timestamp when the field was last filled/satisfied */
  lastSatisfiedAt: z.any().nullable(),

  /** Next deadline timestamp */
  nextDueAt: z.any(),

  /** Number of times the deadline was missed */
  missedCount: z.number().int().nonnegative(),

  /** Level of escalation: 'none' | 'warning' | 'alert' */
  escalationLevel: z.enum(['none', 'warning', 'alert']),
});

export type DataCompletionTask = z.infer<typeof dataCompletionTaskSchema>;
