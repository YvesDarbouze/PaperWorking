export function validateThreadId(
  threadId: string | undefined | null,
): { ok: true; threadId: string } | { ok: false; error: string; status: number } {
  const id = threadId?.trim() || '';
  if (!id) {
    return { ok: false, error: 'threadId is required', status: 400 };
  }
  return { ok: true, threadId: id };
}

export function formatThreadMessagesResponse(
  threadId: string,
  messages: Array<Record<string, unknown>>,
): Record<string, unknown> {
  return { success: true, threadId, messages };
}
