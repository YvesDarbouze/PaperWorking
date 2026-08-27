import { handleSessionsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function GET() {
  const auth = await requireDevSessionAuth();

  const result = await handleSessionsGet({
    authenticate: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    listSessions: async (uid) => [
      {
        id: `sess_${uid}_current`,
        device: 'This browser',
        location: 'Local development',
        ip: '127.0.0.1',
        isCurrent: true,
        lastActiveAt: new Date().toISOString(),
      },
    ],
  });

  return toNextResponse(result);
}
