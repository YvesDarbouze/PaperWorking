export interface SubscribeBody {
  name?: unknown;
  email?: unknown;
}

export function validateSubscribeBody(
  token: string,
  body: SubscribeBody,
): { ok: true; email: string; name: string | null } | { ok: false; error: string; status: number } {
  if (!token) {
    return { ok: false, error: 'Token missing.', status: 400 };
  }

  const emailRaw = typeof body.email === 'string' ? body.email : '';
  const email = emailRaw.trim().toLowerCase();
  const name = typeof body.name === 'string' ? body.name.trim() : null;

  return { ok: true, email, name };
}

export function buildNewSubscriberContact(input: {
  email: string;
  name: string | null;
  fallbackName?: string;
}): Record<string, unknown> {
  const contactId = `contact_${Date.now()}`;
  return {
    id: contactId,
    name: input.name || input.fallbackName || 'Unnamed Investor',
    email: input.email,
    emailConsent: true,
    inAppConsent: true,
    createdAt: new Date().toISOString(),
    relationship: 'Subscriber',
    type: 'Individual',
    potentialTicket: 0,
  };
}
