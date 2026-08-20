import { z } from 'zod';

export const STORAGE_TOTAL_LIMIT_BYTES = 536870912;

export const projectCreateSchema = z.object({
  propertyName: z.string().optional(),
  property_address: z.string().min(1, 'Property address is required'),
  phase: z.enum(['acquisition', 'purchase', 'hold', 'exit']).default('acquisition'),
  date_of_sale: z.string().optional().nullable(),
  entity_type: z.string().optional().default('Sole Proprietor'),
  purchase_price: z.number().nullable().optional(),
  rehab_budget: z.number().nullable().optional(),
  exit_strategy: z.string().optional().default('Flip'),
  answers: z.record(z.string(), z.any()).optional().default({}),
  organizationId: z.string().optional(),
  documents: z
    .array(
      z.object({
        doc_id: z.string(),
        type: z.string(),
        url: z.string(),
        name: z.string().optional(),
        size_bytes: z.number().optional(),
        generated_at: z.string(),
      }),
    )
    .optional()
    .default([]),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

export type ProjectPhase = ProjectCreateInput['phase'];

export function phaseToCurrentPhase(phase: ProjectPhase): number {
  if (phase === 'acquisition') return 1;
  if (phase === 'purchase') return 2;
  if (phase === 'hold') return 3;
  return 4;
}

export function calculateStorageQuotaBytes(existingProjectCount: number): number {
  const newTotalProjects = existingProjectCount + 1;
  return Math.floor(STORAGE_TOTAL_LIMIT_BYTES / newTotalProjects);
}

export function isVendorAccount(userData: {
  account_type?: string;
  accountType?: string;
  role?: string;
} | null | undefined): boolean {
  if (!userData) return false;
  return userData.account_type === 'vendor' || userData.role === 'vendor';
}
