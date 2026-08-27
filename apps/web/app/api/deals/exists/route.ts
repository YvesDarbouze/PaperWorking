import { handleDealsExistsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { findSeedDealBySlug } from '@/lib/marketplace/seed-data';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';

// Rate limit: 30 requests per minute per IP
const ipRequestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequestTimestamps.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  timestamps.push(now);
  ipRequestTimestamps.set(ip, timestamps);
  return true;
}

export async function GET(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const clientIp = forwarded.split(',')[0]?.trim() || '127.0.0.1';

  if (!checkRateLimit(clientIp)) {
    return toNextResponse({
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': '60' },
      body: JSON.stringify({ error: 'Rate limit exceeded. Please try again in 1 minute.' }),
    });
  }

  const url = new URL(request.url);
  const auth = await tryDevSessionAuth();

  const result = await handleDealsExistsGet(
    {
      slug: url.searchParams.get('slug') ?? undefined,
      userId: auth?.uid ?? 'user_guest',
    },
    {
      findBySlug: async (normalizedSlug) => findSeedDealBySlug(normalizedSlug),
    },
  );

  return toNextResponse(result);
}
