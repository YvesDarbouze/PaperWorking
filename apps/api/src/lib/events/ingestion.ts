export const MILESTONE_EVENTS = new Set([
  'onboarding_intent_selected',
  'first_project_created',
  'first_metric_lit',
  'second_project_created',
  'onboarding_celebration_dismissed',
  'onboarding_overlay_dismissed',
  'onboarding_completed',
]);

export function validateEventsPostBody(body: {
  event?: unknown;
}): { ok: true; event: string; properties: Record<string, unknown>; timestamp?: string } | { ok: false; error: string; status: number } {
  const event = typeof body.event === 'string' ? body.event.trim() : '';
  if (!event) {
    return { ok: false, error: 'Missing or invalid event name', status: 400 };
  }
  const properties =
    body && typeof (body as { properties?: unknown }).properties === 'object' && (body as { properties?: unknown }).properties
      ? ((body as { properties: Record<string, unknown> }).properties ?? {})
      : {};
  const timestamp =
    typeof (body as { timestamp?: unknown }).timestamp === 'string'
      ? (body as { timestamp: string }).timestamp
      : undefined;
  return { ok: true, event, properties, timestamp };
}

export function sanitizeEventProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...properties };
  delete sanitized.distinctId;
  delete sanitized.uid;
  delete sanitized.userId;
  delete sanitized.untrustedUid;
  return sanitized;
}

export function isAnonymousAuthToken(token: Record<string, unknown>): boolean {
  const firebase = token.firebase as { sign_in_provider?: string } | undefined;
  return token.provider_id === 'anonymous' || firebase?.sign_in_provider === 'anonymous';
}
