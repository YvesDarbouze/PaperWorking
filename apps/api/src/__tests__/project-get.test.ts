import { describe, expect, it, jest } from '@jest/globals';
import { handleProjectGet } from '../routes/projects/get/handler.js';

describe('GET /api/projects/[id]', () => {
  it('returns project document when found', async () => {
    const result = await handleProjectGet(
      { projectId: 'proj_abc' },
      {
        authenticate: jest.fn().mockResolvedValue({ uid: 'user_1' }),
        getProject: jest.fn().mockResolvedValue({
          id: 'proj_abc',
          project_id: 'proj_abc',
          propertyName: '123 Elm St',
          status: 'acquisition',
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      project: {
        id: 'proj_abc',
        project_id: 'proj_abc',
        propertyName: '123 Elm St',
        status: 'acquisition',
      },
    });
  });

  it('returns 404 when project missing', async () => {
    const result = await handleProjectGet(
      { projectId: 'missing' },
      {
        authenticate: jest.fn().mockResolvedValue({ uid: 'user_1' }),
        getProject: jest.fn().mockResolvedValue(null),
      },
    );

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: 'Project not found' });
  });

  it('returns 400 for empty project id', async () => {
    const result = await handleProjectGet(
      { projectId: '  ' },
      {
        authenticate: jest.fn().mockResolvedValue({ uid: 'user_1' }),
        getProject: jest.fn(),
      },
    );

    expect(result.status).toBe(400);
  });

  it('returns auth error when authenticate fails', async () => {
    const result = await handleProjectGet(
      { projectId: 'proj_1' },
      {
        authenticate: jest.fn().mockResolvedValue({ status: 401, body: { error: 'Unauthorized' } }),
      },
    );

    expect(result.status).toBe(401);
  });
});
