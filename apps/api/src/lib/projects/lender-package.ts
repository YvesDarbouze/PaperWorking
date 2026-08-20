import {
  DEFAULT_CHECKLIST_DEFINITIONS,
  parseChecklistsDoc,
  type LenderChecklistDefinitions,
} from '../providers/lender-checklists.js';

export const LENDER_PACKAGE_VENDOR_SLOTS = [
  'f4HardMoneyLenderVendor',
  'f4CdcVendor',
  'f4AppraiserVendor',
  'f4ClosingAttorneyVendor',
] as const;

export function validateLenderPackageAccess(input: {
  role: string;
  partyId?: string | null;
}): { ok: true } | { ok: false; error: string; status: number } {
  if (input.role === 'LP') {
    return { ok: false, error: 'Access denied: LPs cannot view lender package.', status: 403 };
  }
  if (input.role === 'Vendor') {
    if (!LENDER_PACKAGE_VENDOR_SLOTS.includes((input.partyId || '') as (typeof LENDER_PACKAGE_VENDOR_SLOTS)[number])) {
      return {
        ok: false,
        error: 'Access denied: Vendor is not authorized to view lender package.',
        status: 403,
      };
    }
  }
  return { ok: true };
}

export function resolveActiveLoanInstruments(input: {
  loanInstruments: string[];
  financingType?: string;
}): string[] {
  if (input.loanInstruments.length > 0) return input.loanInstruments;
  if (input.financingType === 'Financed') return ['Conventional'];
  return [];
}

export function buildCustomaryChecklistNames(
  activeInstruments: string[],
  checklists: LenderChecklistDefinitions = DEFAULT_CHECKLIST_DEFINITIONS,
): string[] {
  const names = new Set<string>();
  for (const instrument of activeInstruments) {
    const list =
      checklists[instrument as keyof LenderChecklistDefinitions] || checklists.Conventional;
    for (const name of list) names.add(name);
  }
  return Array.from(names);
}

export function buildSeededLenderPackageItems(input: {
  projectId: string;
  names: string[];
  createId: () => string;
}): Array<Record<string, unknown>> {
  return input.names.map((name, index) => ({
    id: input.createId(),
    projectId: input.projectId,
    name,
    isCustom: false,
    status: 'Pending',
    fileId: null,
    fileName: null,
    fileUrl: null,
    reminderCadence: 'none',
    lastRemindedAt: null,
    createdAt: new Date(Date.now() + index * 1000).toISOString(),
  }));
}

export function validateLenderPackageCreateBody(body: {
  name?: unknown;
  reminderCadence?: unknown;
}): { ok: true; name: string; reminderCadence: string } | { ok: false; error: string; status: number } {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return { ok: false, error: 'Item name is required', status: 400 };
  }
  const reminderCadence =
    typeof body.reminderCadence === 'string' ? body.reminderCadence : 'none';
  return { ok: true, name, reminderCadence };
}

export function buildCustomLenderPackageItem(input: {
  projectId: string;
  id: string;
  name: string;
  reminderCadence: string;
}): Record<string, unknown> {
  return {
    id: input.id,
    projectId: input.projectId,
    name: input.name,
    isCustom: true,
    status: 'Pending',
    fileId: null,
    fileName: null,
    fileUrl: null,
    reminderCadence: input.reminderCadence,
    lastRemindedAt: null,
    createdAt: new Date().toISOString(),
  };
}

export { parseChecklistsDoc, DEFAULT_CHECKLIST_DEFINITIONS };
