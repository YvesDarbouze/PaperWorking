export function verifyPlaidConnectionOwnership(
  connection: { userId: string; status?: string } | null,
  uid: string,
): { ok: true; connection: { userId: string; status?: string } } | { ok: false; error: string; status: number } {
  if (!connection) {
    return { ok: false, error: 'Connection not found', status: 404 };
  }
  if (connection.userId !== uid) {
    return { ok: false, error: 'Forbidden', status: 403 };
  }
  return { ok: true, connection };
}
