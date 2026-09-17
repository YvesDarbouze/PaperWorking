import {
  GET as canonicalGet,
  POST as canonicalPost,
} from '@/app/api/deal-calculator/property-lookup/route';

export const dynamic = 'force-dynamic';

function attachDeprecationHeaders<T extends Response>(response: T): T {
  response.headers.set('Deprecation', 'true');
  response.headers.set(
    'Link',
    '</api/deal-calculator/property-lookup>; rel="successor-version"',
  );
  response.headers.set(
    'Warning',
    '299 - "Deprecated API route: /api/deal-analyzer/property-lookup has been renamed to /api/deal-calculator/property-lookup"',
  );
  return response;
}

/**
 * @deprecated Historical alias for /api/deal-analyzer/property-lookup.
 * Canonical route is /api/deal-calculator/property-lookup.
 */
export async function GET(request: Request) {
  console.warn(
    '[DEPRECATED] GET /api/deal-analyzer/property-lookup is deprecated. Use /api/deal-calculator/property-lookup instead.',
  );
  const response = await canonicalGet(request);
  return attachDeprecationHeaders(response);
}

/**
 * @deprecated Historical alias for /api/deal-analyzer/property-lookup.
 * Canonical route is /api/deal-calculator/property-lookup.
 */
export async function POST(request: Request) {
  console.warn(
    '[DEPRECATED] POST /api/deal-analyzer/property-lookup is deprecated. Use /api/deal-calculator/property-lookup instead.',
  );
  const response = await canonicalPost(request);
  return attachDeprecationHeaders(response);
}

