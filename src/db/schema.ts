import { pgTable, text, varchar, jsonb, timestamp, real, boolean } from 'drizzle-orm/pg-core';

export interface GateCriterionSnapshot {
  key: string;
  label: string;
  status: boolean;
}

export const phaseGateEvents = pgTable('phase_gate_events', {
  id: varchar('id', { length: 255 }).primaryKey(),
  projectId: varchar('project_id', { length: 255 }).notNull(),
  fromPhase: varchar('from_phase', { length: 50 }).notNull(),
  toPhase: varchar('to_phase', { length: 50 }).notNull(),
  actorId: varchar('actor_id', { length: 255 }).notNull(),
  actorRole: varchar('actor_role', { length: 100 }).notNull(),
  criteriaSnapshot: jsonb('criteria_snapshot').$type<GateCriterionSnapshot[]>().notNull(),
  overrideReason: text('override_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type PhaseGateEvent = typeof phaseGateEvents.$inferSelect;
export type NewPhaseGateEvent = typeof phaseGateEvents.$inferInsert;

// ── PROMPT 3: Operations & Asset Management Tables ─────────────────────────────

export const propertyActuals = pgTable('property_actuals', {
  id: varchar('id', { length: 255 }).primaryKey(),
  projectId: varchar('project_id', { length: 255 }).notNull(),
  period: varchar('period', { length: 7 }).notNull(), // Format YYYY-MM
  grossRent: real('gross_rent').notNull().default(0),
  operatingExpenses: real('operating_expenses').notNull().default(0),
  noi: real('noi').notNull().default(0),
  capex: real('capex').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type PropertyActualRecord = typeof propertyActuals.$inferSelect;
export type NewPropertyActualRecord = typeof propertyActuals.$inferInsert;

export const rentRoll = pgTable('rent_roll', {
  id: varchar('id', { length: 255 }).primaryKey(),
  projectId: varchar('project_id', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 100 }).notNull(),
  tenantName: text('tenant_name'),
  leaseStart: varchar('lease_start', { length: 50 }),
  leaseEnd: varchar('lease_end', { length: 50 }),
  monthlyRent: real('monthly_rent').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('occupied'), // 'occupied' | 'vacant' | 'notice'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type RentRollRecord = typeof rentRoll.$inferSelect;
export type NewRentRollRecord = typeof rentRoll.$inferInsert;

export const budgetBaselines = pgTable('budget_baselines', {
  id: varchar('id', { length: 255 }).primaryKey(),
  projectId: varchar('project_id', { length: 255 }).notNull(),
  snapshottedAt: timestamp('snapshotted_at').defaultNow().notNull(),
  monthlyGrossRent: real('monthly_gross_rent').notNull().default(0),
  monthlyExpenses: real('monthly_expenses').notNull().default(0),
  monthlyNoi: real('monthly_noi').notNull().default(0),
  underwritingAssumptions: jsonb('underwriting_assumptions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type BudgetBaselineRecord = typeof budgetBaselines.$inferSelect;
export type NewBudgetBaselineRecord = typeof budgetBaselines.$inferInsert;

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 255 }).primaryKey(),
  recipientId: varchar('recipient_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  projectId: varchar('project_id', { length: 255 }),
  actorId: varchar('actor_id', { length: 255 }),
  actorName: text('actor_name'),
  deepLinkUrl: text('deep_link_url').notNull(),
  read: boolean('read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type NotificationDbRecord = typeof notifications.$inferSelect;
export type NewNotificationDbRecord = typeof notifications.$inferInsert;

