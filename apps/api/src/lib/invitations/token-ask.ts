export const MAX_INVITATION_ASK_MESSAGE_LENGTH = 2000;

export function validateInvitationAskBody(
  token: string,
  body: { message?: unknown },
): { ok: true; message: string } | { ok: false; error: string; status: number } {
  if (!token || token.length < 16) {
    return { ok: false, error: 'Invalid token format', status: 400 };
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return { ok: false, error: 'Message is required.', status: 400 };
  }
  if (message.length > MAX_INVITATION_ASK_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Message must be ${MAX_INVITATION_ASK_MESSAGE_LENGTH} characters or fewer.`,
      status: 400,
    };
  }

  return { ok: true, message };
}

export function isInvitationExpired(expiresAt: string | Date): boolean {
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return date.getTime() < Date.now();
}

export function buildInvestorInquiryMessage(message: string): {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
} {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sender: 'investor',
    text: message,
    createdAt: new Date().toISOString(),
  };
}
