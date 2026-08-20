export interface CreateRuleInput {
  projectId: string;
  name: string;
  ruleType?: string;
  conditions: unknown;
  action: unknown;
  priority?: number;
}

export function validateCreateRuleBody(
  body: Record<string, unknown>,
): { ok: true; value: CreateRuleInput } | { ok: false; error: string } {
  const projectId = body.projectId;
  const name = body.name;
  const conditions = body.conditions;
  const action = body.action;

  if (
    !projectId ||
    typeof projectId !== 'string' ||
    !name ||
    typeof name !== 'string' ||
    conditions === undefined ||
    action === undefined
  ) {
    return {
      ok: false,
      error: 'projectId, name, conditions, and action are required',
    };
  }

  return {
    ok: true,
    value: {
      projectId,
      name,
      ruleType: typeof body.ruleType === 'string' ? body.ruleType : undefined,
      conditions,
      action,
      priority: typeof body.priority === 'number' ? body.priority : undefined,
    },
  };
}

export function validateRuleId(ruleId: string | undefined): ruleId is string {
  return typeof ruleId === 'string' && ruleId.length > 0;
}

export interface UpdateRulePatch {
  name?: string;
  conditions?: unknown;
  action?: unknown;
  isActive?: boolean;
  priority?: number;
}

export function buildRuleUpdatePatch(body: Record<string, unknown>): UpdateRulePatch {
  return {
    name: body.name ? String(body.name) : undefined,
    conditions: body.conditions !== undefined ? body.conditions : undefined,
    action: body.action !== undefined ? body.action : undefined,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    priority: body.priority !== undefined ? Number(body.priority) : undefined,
  };
}
