import { handleContactPost, type ContactFormInput } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';

export const dynamic = 'force-dynamic';

/** POST /api/contact — public general inquiry form (Nest parity via shared handler). */
export async function POST(request: Request) {
  let body: ContactFormInput = {};
  try {
    body = (await request.json()) as ContactFormInput;
  } catch {
    return toNextResponse({
      status: 400,
      body: { success: false, error: 'Invalid request body' },
    });
  }

  const result = await handleContactPost(body);
  return toNextResponse(result);
}
