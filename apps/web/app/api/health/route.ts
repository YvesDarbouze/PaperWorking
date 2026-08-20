import { handleHealthGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';

export async function GET() {
  const result = await handleHealthGet({
    appName: 'PaperWorking Migration',
    environment: process.env.NODE_ENV ?? 'development',
  });

  return toNextResponse(result);
}
