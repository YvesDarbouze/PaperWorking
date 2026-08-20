export interface SendEmailBody {
  idToken?: unknown;
  projectId?: unknown;
  to?: unknown;
  subject?: unknown;
  html?: unknown;
  text?: unknown;
}

export function validateSendEmailBody(
  body: SendEmailBody,
): { ok: true; value: { projectId: string; to: string[]; subject: string; html: string; text?: string } } | { ok: false; error: string } {
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const subject = typeof body.subject === 'string' ? body.subject : '';
  const html = typeof body.html === 'string' ? body.html : '';
  const to = Array.isArray(body.to) ? body.to.filter((e): e is string => typeof e === 'string' && !!e.trim()) : [];
  const text = typeof body.text === 'string' ? body.text : undefined;

  if (!body.idToken || !projectId || !to.length || !subject || !html) {
    return {
      ok: false,
      error: 'Missing required fields: idToken, projectId, to, subject, html',
    };
  }

  return { ok: true, value: { projectId, to, subject, html, text } };
}
