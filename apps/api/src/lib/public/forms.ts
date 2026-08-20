export const WAITLIST_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidWaitlistEmail(email: unknown): email is string {
  return typeof email === 'string' && WAITLIST_EMAIL_REGEX.test(email.trim());
}

export interface ContactFormInput {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  body?: unknown;
  category?: unknown;
}

export interface ValidatedContactForm {
  name: string;
  email: string;
  subject: string;
  body: string;
  tag: string;
}

export function validateContactForm(
  input: ContactFormInput,
): { ok: true; value: ValidatedContactForm } | { ok: false; error: string } {
  const email = input.email;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { ok: false, error: 'Valid email is required.' };
  }
  const subject = input.subject;
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return { ok: false, error: 'Subject is required.' };
  }
  const body = input.body;
  if (!body || typeof body !== 'string' || !body.trim()) {
    return { ok: false, error: 'Message body is required.' };
  }

  const cleanName =
    input.name && typeof input.name === 'string' ? input.name.trim() : email.split('@')[0];
  const tag =
    input.category && typeof input.category === 'string'
      ? input.category.toLowerCase().replace(/\s+/g, '-')
      : 'general-inquiry';

  return {
    ok: true,
    value: {
      name: cleanName,
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      body: body.trim(),
      tag,
    },
  };
}

export function generateSupportTicketId(now: () => number = Date.now): string {
  return `ticket_${now()}_${Math.random().toString(36).substring(2, 7)}`;
}
