/** Canonical Firestore `/users/{documentId}` key — always lowercase email. */
export function userDocumentIdFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new Error('A valid email is required for user document id');
  }
  return normalized;
}

/** Default display label when Firebase displayName is unavailable. */
export function displayNameFromEmail(email: string): string {
  const local = email.trim().toLowerCase().split('@')[0] ?? 'User';
  const cleaned = local.replace(/[._+-]+/g, ' ').trim();
  if (!cleaned) return 'User';
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
