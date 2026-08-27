import { handleAuthResetPasswordPost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await handleAuthResetPasswordPost(body, {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    // Dev: no-op sender — always returns success (enumeration-safe).
    sendPasswordReset: async () => undefined,
  });

  return toNextResponse(result);
}
