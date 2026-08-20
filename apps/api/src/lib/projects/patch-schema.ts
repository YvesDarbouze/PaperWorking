import { z } from 'zod';

export const updateFinancialsSchema = z
  .object({
    loanAmount: z
      .number()
      .nonnegative({ message: 'loanAmount must be non-negative' })
      .nullish(),
    loanInterestRate: z
      .number()
      .nonnegative({ message: 'loanInterestRate must be non-negative' })
      .nullish(),
    loanTermYears: z
      .number()
      .positive({ message: 'loanTermYears must be positive' })
      .nullish(),
    loanOriginationPoints: z
      .number()
      .nonnegative({ message: 'loanOriginationPoints must be non-negative' })
      .nullish(),
    downPaymentPercent: z.number().nonnegative().max(100).nullish(),
    purchasePrice: z.number().nonnegative().optional(),
    estimatedARV: z.number().nonnegative().optional(),
    arv: z.number().nonnegative().optional(),
    annualDebtService: z
      .any()
      .refine((val) => val === undefined, {
        message: 'annualDebtService is read-only and cannot be updated',
      })
      .optional(),
  })
  .passthrough();

export const projectPatchBodySchema = z
  .object({
    financials: updateFinancialsSchema.optional(),
    status: z.enum(['acquisition', 'fund', 'hold', 'exit']).optional(),
  })
  .passthrough();

export type ProjectPatchBody = z.infer<typeof projectPatchBodySchema>;

export function mergeProjectFinancials(
  existing: Record<string, unknown>,
  patch: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!patch) return existing;
  return { ...existing, ...patch };
}

export interface MaterialChangeInput {
  projectData: {
    financials?: {
      purchasePrice?: number;
      equityTerms?: { funding_target?: number };
    };
    rehabTier?: string;
    scopeTier?: string;
    controlStatus?: string;
  };
  financials?: Record<string, unknown>;
  topLevelUpdates: Record<string, unknown>;
}

export interface MaterialChangeResult {
  hasMaterialChanges: boolean;
  changedFields: string[];
}

export function detectMaterialProjectChanges(input: MaterialChangeInput): MaterialChangeResult {
  const { projectData, financials, topLevelUpdates } = input;
  const changedFields: string[] = [];

  const oldPrice = projectData.financials?.purchasePrice;
  const newPrice = financials?.purchasePrice;
  if (newPrice !== undefined && newPrice !== oldPrice) {
    changedFields.push(
      `Purchase Price (from $${((oldPrice || 0) / 100).toLocaleString()} to $${(Number(newPrice) / 100).toLocaleString()})`,
    );
  }

  const oldRehab = projectData.rehabTier || projectData.scopeTier;
  const newRehab = topLevelUpdates.rehabTier || topLevelUpdates.scopeTier;
  if (newRehab !== undefined && newRehab !== oldRehab) {
    changedFields.push(`Rehab Scope (from ${oldRehab || 'None'} to ${newRehab})`);
  }

  const oldTarget = projectData.financials?.equityTerms?.funding_target;
  const equityTerms = financials?.equityTerms as { funding_target?: number } | undefined;
  const newTarget = equityTerms?.funding_target;
  if (newTarget !== undefined && newTarget !== oldTarget) {
    changedFields.push(
      `Funding Target (from $${((oldTarget || 0) / 100).toLocaleString()} to $${(newTarget / 100).toLocaleString()})`,
    );
  }

  const oldControl = projectData.controlStatus;
  const newControl = topLevelUpdates.controlStatus;
  if (newControl !== undefined && newControl !== oldControl) {
    changedFields.push(`Control Status (from ${oldControl || 'None'} to ${newControl})`);
  }

  return {
    hasMaterialChanges: changedFields.length > 0,
    changedFields,
  };
}

export function buildProjectPatchPayload(
  topLevelUpdates: Record<string, unknown>,
  financials: Record<string, unknown> | undefined,
  existingFinancials: Record<string, unknown>,
): Record<string, unknown> {
  const updatePayload: Record<string, unknown> = {
    ...topLevelUpdates,
    updatedAt: new Date(),
  };

  if (financials) {
    updatePayload.financials = mergeProjectFinancials(existingFinancials, financials);
  }

  return updatePayload;
}
