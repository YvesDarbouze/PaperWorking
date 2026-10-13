import { z } from 'zod';

/**
 * Request-body schemas for the per-project collaboration tools
 * (message board, Campfire, check-ins, to-dos, card table, hill chart,
 * schedule, guests, stacks). Client-supplied author fields are not part of
 * any schema: zod strips unknown keys, and routes stamp authors server-side.
 */

export const BASECAMP_TEXT_LIMITS = {
  title: 200,
  body: 20_000,
  comment: 5_000,
  chat: 2_000,
} as const;

const requiredText = (max: number) => z.string().trim().min(1, 'Required').max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();

/**
 * Accepts the stored legacy phase keys plus the canonical REIL label `fund`,
 * which is stored as `purchase` (see `toLegacyPhase` in @paperworking/shared).
 */
export const basecampPhaseSchema = z
  .enum(['acquisition', 'purchase', 'fund', 'hold', 'exit'])
  .transform((p) => (p === 'fund' ? 'purchase' : p));

export type BasecampPhase = z.output<typeof basecampPhaseSchema>;

/** Calendar date in YYYY-MM-DD form that exists (rejects 2026-02-30, 2026-13-45). */
export const isoCalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number) as [number, number, number];
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, 'Date is not a real calendar date');

export const messageCategorySchema = z.enum(['announcement', 'decision', 'contractor', 'inspection', 'general']);
export const checkInFrequencySchema = z.enum(['daily', 'weekly', 'biweekly']);
export const scheduleCategorySchema = z.enum(['contingency', 'closing', 'milestone', 'meeting', 'inspection']);
export const cardPrioritySchema = z.enum(['low', 'medium', 'high']);
export const projectGuestTypeSchema = z.enum(['vendor', 'lender', 'title', 'limited_partner', 'other']);

export const messageTopicCreateSchema = z.object({
  title: requiredText(BASECAMP_TEXT_LIMITS.title),
  content: requiredText(BASECAMP_TEXT_LIMITS.body),
  category: messageCategorySchema.optional(),
  phase: basecampPhaseSchema.optional(),
  vendorVisible: z.boolean().optional(),
});

export const messageCommentCreateSchema = z.object({
  content: requiredText(BASECAMP_TEXT_LIMITS.comment),
});

export const campfireMessageCreateSchema = z.object({
  text: requiredText(BASECAMP_TEXT_LIMITS.chat),
});

export const checkInAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: requiredText(BASECAMP_TEXT_LIMITS.comment),
});

export const checkInQuestionCreateSchema = z.object({
  newPrompt: requiredText(BASECAMP_TEXT_LIMITS.title),
  frequency: checkInFrequencySchema.optional(),
});

/** POST /checkins: `{questionId, answer}` answers a question, `{newPrompt, frequency}` creates one. */
export const checkInPostSchema = z.union([checkInAnswerSchema, checkInQuestionCreateSchema]);

export const todoActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create_list'),
    title: requiredText(BASECAMP_TEXT_LIMITS.title),
    phase: basecampPhaseSchema.optional(),
  }),
  z.object({
    action: z.literal('add_task'),
    listId: z.string().min(1),
    title: requiredText(BASECAMP_TEXT_LIMITS.title),
    dueDate: isoCalendarDateSchema.optional(),
    assigneeId: z.string().min(1).optional(),
    notes: optionalText(BASECAMP_TEXT_LIMITS.body),
    vendorVisible: z.boolean().optional(),
    linkedDocumentId: z.string().min(1).optional(),
  }),
  z.object({
    action: z.literal('update_task'),
    taskId: z.string().min(1),
    title: requiredText(BASECAMP_TEXT_LIMITS.title).optional(),
    dueDate: isoCalendarDateSchema.optional(),
    assigneeId: z.string().min(1).optional(),
    notes: optionalText(BASECAMP_TEXT_LIMITS.body),
    vendorVisible: z.boolean().optional(),
    linkedDocumentId: z.string().min(1).optional(),
  }),
  z.object({
    action: z.literal('attach_document'),
    taskId: z.string().min(1),
    documentId: z.string().min(1),
  }),
  z.object({
    action: z.literal('add_subtask'),
    taskId: z.string().min(1),
    title: requiredText(BASECAMP_TEXT_LIMITS.title),
  }),
  z.object({
    action: z.literal('toggle_task'),
    taskId: z.string().min(1),
  }),
  z.object({
    action: z.literal('toggle_subtask'),
    taskId: z.string().min(1),
    subtaskId: z.string().min(1),
  }),
]);

export type TodoAction = z.infer<typeof todoActionSchema>;

export const cardTableActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add_card'),
    columnId: z.string().min(1),
    title: requiredText(BASECAMP_TEXT_LIMITS.title),
    description: optionalText(BASECAMP_TEXT_LIMITS.body),
    priority: cardPrioritySchema.optional(),
    dueDate: isoCalendarDateSchema.optional(),
    vendorVisible: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('move_card'),
    cardId: z.string().min(1),
    targetColumnId: z.string().min(1),
  }),
  z.object({
    action: z.literal('add_column'),
    title: requiredText(BASECAMP_TEXT_LIMITS.title),
  }),
]);

export type CardTableAction = z.infer<typeof cardTableActionSchema>;

export const hillChartActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update_position'),
    itemId: z.string().min(1),
    position: z.number().finite(),
    statusNotes: optionalText(BASECAMP_TEXT_LIMITS.comment),
  }),
  z.object({
    action: z.literal('add_item'),
    scopeName: requiredText(BASECAMP_TEXT_LIMITS.title),
    position: z.number().finite().optional(),
    phase: basecampPhaseSchema.optional(),
    statusNotes: optionalText(BASECAMP_TEXT_LIMITS.comment),
  }),
]);

export type HillChartAction = z.infer<typeof hillChartActionSchema>;

export const scheduleEventCreateSchema = z.object({
  title: requiredText(BASECAMP_TEXT_LIMITS.title),
  date: isoCalendarDateSchema,
  category: scheduleCategorySchema.optional(),
  phase: basecampPhaseSchema.optional(),
  isHardDate: z.boolean().optional(),
  notes: optionalText(BASECAMP_TEXT_LIMITS.body),
  vendorVisible: z.boolean().optional(),
});

export const projectGuestInviteSchema = z.object({
  uid: z.string().trim().min(1).max(128),
  name: requiredText(BASECAMP_TEXT_LIMITS.title),
  email: z.string().trim().email('Invalid email address').optional(),
  company: optionalText(BASECAMP_TEXT_LIMITS.title),
  guestType: projectGuestTypeSchema.optional(),
  personalNote: optionalText(BASECAMP_TEXT_LIMITS.body),
});

export const projectGuestRemoveSchema = z.object({
  uid: z.string().trim().min(1).max(128),
});

export const publicSharePageEnum = z.enum(['overview', 'messages', 'tasks', 'card_table', 'schedule', 'docs']);

export const publicShareLinkCreateSchema = z.object({
  page: publicSharePageEnum,
  label: optionalText(BASECAMP_TEXT_LIMITS.title),
  vendorOnly: z.boolean().optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const projectStackCreateSchema = z.object({
  name: requiredText(BASECAMP_TEXT_LIMITS.title),
  description: optionalText(BASECAMP_TEXT_LIMITS.chat),
  projectIds: z.array(z.string().min(1).max(128)).max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a #RRGGBB hex value')
    .optional(),
});
