/**
 * Hold-Phase Zod Validation Schemas
 *
 * HD-3 · Validation layer for Hold registry writes.
 * Every field validates against the canonical Hold registry types.
 *
 * Used by:
 *   - PATCH /api/projects/[id]/hold/registry (new canonical route)
 *   - Server Actions updating Hold-phase data
 */

import { z } from 'zod';

// ── Source Tags ──────────────────────────────────────────────────────────────

export const sourceTagSchema = z.enum([
  'user_assumption',
  'user_actual',
  'document',
  'derived',
  'plaid',
]);

// ── Enums ────────────────────────────────────────────────────────────────────

export const renovationTierSchema = z.enum([
  'STAGE',
  'REFURBISH',
  'RENOVATE',
  'GUT',
  'DEVELOP',
]);

export const occupancyDuringHoldSchema = z.enum([
  'VACANT_FULL_REHAB',
  'OCCUPIED',
  'PARTIAL',
]);

export const utilitiesResponsibilitySchema = z.enum([
  'LANDLORD',
  'TENANT',
  'SPLIT',
]);

export const holdingCostCategorySchema = z.enum([
  'tax',
  'insurance',
  'security',
  'maintenance',
  'utilities',
  'management',
  'HOA',
  'capex',
]);

export const leaseStructureSchema = z.enum(['NNN', 'GROSS']);

// ── Registry Value Schemas ───────────────────────────────────────────────────

export const registryValueSchema = z.object({
  projected: z.number().optional(),
  actual: z.number().optional(),
  sourceTag: sourceTagSchema,
  updatedAt: z.string().datetime(),
});

// ── Entry Schemas ────────────────────────────────────────────────────────────

export const rehabSpendEditSchema = z.object({
  editedAt: z.string().datetime(),
  editedBy: z.string().min(1),
  previousAmount: z.number(),
  previousNote: z.string(),
});

export const rehabSpendEntrySchema = z.object({
  id: z.string().min(1),
  amount: z.number().min(0),
  date: z.string().datetime(),
  category: z.enum(['capex', 'maintenance']),
  note: z.string(),
  vendorRef: z.string().optional(),
  receiptRef: z.string().optional(),
  editHistory: z.array(rehabSpendEditSchema).default([]),
  sourceTag: sourceTagSchema,
  createdAt: z.string().datetime(),
});

export const holdingCostRecordSchema = z.object({
  category: holdingCostCategorySchema,
  monthlyAmount: z.number().min(0),
  dueDay: z.number().int().min(1).max(31).optional(),
  sourceTag: sourceTagSchema,
  carriedFromFund: z.boolean().optional(),
  updatedAt: z.string().datetime(),
});

export const currentValueEntrySchema = z.object({
  value: z.number().min(0),
  date: z.string().datetime(),
  sourceTag: sourceTagSchema,
  documentRef: z.string().optional(),
});

export const listingAdEntrySchema = z.object({
  id: z.string().min(1),
  date: z.string().datetime(),
  channel: z.string().min(1),
  spend: z.number().min(0),
  note: z.string(),
  isRecurring: z.boolean().optional(),
  createdAt: z.string().datetime(),
});

export const showingEntrySchema = z.object({
  id: z.string().min(1),
  date: z.string().datetime(),
  note: z.string().optional(),
  isSeriousInquiry: z.boolean().optional(),
  createdAt: z.string().datetime(),
});

export const targetLeaseTermsSchema = z.object({
  rate: z.number().min(0),
  termMonths: z.number().int().min(1),
  structure: leaseStructureSchema,
});

export const reservePolicySchema = z.object({
  vacancyBufferPct: z.number().min(0).max(100),
  maintenanceReservePolicy: z.string(),
  capexReservePolicy: z.string(),
});

export const reserveFundingStatusSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['vacancy', 'maintenance', 'capex']),
  status: z.enum(['unfunded', 'partially_funded', 'funded']),
  evidenceDocRefs: z.array(z.string()),
  updatedAt: z.string().datetime(),
});

export const screeningChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  completed: z.boolean(),
  completedAt: z.string().datetime().optional(),
});

// ── Hold Registry Write Body ─────────────────────────────────────────────────

/**
 * Partial update schema for the Hold registry.
 * Every field is optional — callers send only the fields they're updating.
 * The API route merges updates into the existing registry.
 */
export const holdRegistryUpdateSchema = z.object({
  // H1: Renovation Plan
  renovationTier: renovationTierSchema.optional(),
  rehabBudget: registryValueSchema.optional(),
  rehabCompletionTarget: z.string().datetime().optional(),

  // H2: Renovation Tracking
  rehabSpend: z.array(rehabSpendEntrySchema).optional(),
  rehabCompletedDate: z.string().datetime().optional(),

  // H3: Holding Costs
  holdingCosts: z.record(holdingCostCategorySchema, holdingCostRecordSchema).optional(),

  // H4: Market & Value
  currentValueSeries: z.array(currentValueEntrySchema).optional(),

  // H5: Go to Market
  targetRent: z.number().min(0).optional(),
  targetLeaseTerms: targetLeaseTermsSchema.optional(),
  listPriceSale: z.number().min(0).optional(),
  listingAdLog: z.array(listingAdEntrySchema).optional(),
  showingsLog: z.array(showingEntrySchema).optional(),
  screeningChecklist: z.array(screeningChecklistItemSchema).optional(),

  // Operational State
  occupancyDuringHold: occupancyDuringHoldSchema.optional(),
  utilitiesResponsibility: utilitiesResponsibilitySchema.optional(),

  // Reserve Policies
  reservePolicies: reservePolicySchema.optional(),
  reserveFundingStatus: z.array(reserveFundingStatusSchema).optional(),
}).strict(); // No extra fields — canonical registry only

export type HoldRegistryUpdate = z.infer<typeof holdRegistryUpdateSchema>;
