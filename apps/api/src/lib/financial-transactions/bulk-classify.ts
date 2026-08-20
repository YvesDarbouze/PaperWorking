export function validateBulkClassifyBody(body: {
  ids?: unknown;
  category?: unknown;
}): { ok: true; ids: string[]; category: string } | { ok: false; error: string } {
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: 'ids array is required' };
  }

  const stringIds = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (stringIds.length !== ids.length) {
    return { ok: false, error: 'ids array is required' };
  }

  const category = body.category;
  if (!category || typeof category !== 'string') {
    return { ok: false, error: 'category is required' };
  }

  return { ok: true, ids: stringIds, category };
}
