import { describe, expect, it, jest } from '@jest/globals';
import { handleSessionsGet } from '../routes/auth/sessions/handler.js';

describe('GET /api/auth/sessions', () => {
  it('returns session list for authenticated user', async () => {
    const result = await handleSessionsGet({
      authenticate: jest.fn().mockResolvedValue({ uid: 'user_1' }),
      listSessions: jest.fn().mockResolvedValue([
        { id: 's1', device: 'Mac', isCurrent: true },
      ]),
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual([{ id: 's1', device: 'Mac', isCurrent: true }]);
  });

  it('returns 401 without authenticate dep default', async () => {
    const result = await handleSessionsGet();
    expect(result.status).toBe(401);
  });
});
