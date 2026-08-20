export function validateSourcingWebhookAuth(input: {
  webhookSecret?: string;
  authorization?: string | null;
}): { ok: true } | { ok: false; error: string; status: number } {
  if (!input.webhookSecret) {
    return { ok: false, error: 'Webhook endpoint not configured', status: 503 };
  }
  if (input.authorization !== `Bearer ${input.webhookSecret}`) {
    return { ok: false, error: 'Unauthorized', status: 401 };
  }
  return { ok: true };
}

export function parseSourcingOwnershipShares(raw: unknown): Record<string, number> {
  if (!raw) return { SYSTEM: 100 };
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, number>;
    } catch {
      return { SYSTEM: 100 };
    }
  }
  if (typeof raw === 'object') return raw as Record<string, number>;
  return { SYSTEM: 100 };
}

export function validateSourcingWebhookBody(body: {
  organizationId?: unknown;
  sourceVendor?: unknown;
}): { ok: true } | { ok: false; error: string; status: number } {
  if (!body.organizationId || !body.sourceVendor) {
    return { ok: false, error: 'Missing required fields', status: 400 };
  }
  return { ok: true };
}
