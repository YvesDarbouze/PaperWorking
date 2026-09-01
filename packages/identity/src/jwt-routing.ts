/** Peek JWT issuer without verification — routes token to the correct IdP verifier. */
export function peekTokenIssuer(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as { iss?: unknown };
    return typeof payload.iss === 'string' ? payload.iss : null;
  } catch {
    return null;
  }
}

export function isFirebaseIssuedToken(token: string): boolean {
  const iss = peekTokenIssuer(token);
  return iss?.includes('securetoken.google.com') ?? false;
}

export function isSupabaseIssuedToken(token: string): boolean {
  const iss = peekTokenIssuer(token);
  return iss?.includes('supabase.co/auth') ?? false;
}
