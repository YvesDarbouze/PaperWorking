import { handleReportsGeneratePost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';

export async function POST(request: Request) {
  let body: { type?: 'monthly' | 'quarterly' | 'yearly' | 'overall'; format?: 'pdf' | 'csv' } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await handleReportsGeneratePost(body);
  return toNextResponse(result);
}
