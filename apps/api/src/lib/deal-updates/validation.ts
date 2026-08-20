export interface DealUpdateBody {
  title?: unknown;
  body?: unknown;
}

export function validateDealUpdateBody(
  body: DealUpdateBody,
): { ok: true; title: string | null; body: string } | { ok: false; error: string; status: number } {
  const updateBody = typeof body.body === 'string' ? body.body : '';
  if (!updateBody.trim()) {
    return { ok: false, error: 'body is required', status: 422 };
  }
  if (updateBody.length > 4000) {
    return { ok: false, error: 'body must be 4000 characters or fewer', status: 422 };
  }

  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null;

  return { ok: true, title, body: updateBody.trim() };
}
