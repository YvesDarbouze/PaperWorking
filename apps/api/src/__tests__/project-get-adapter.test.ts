import { describe, expect, it } from '@jest/globals';
import { createFirestoreProjectGetter } from '../routes/projects/get/firestore-adapter.js';

describe('createFirestoreProjectGetter', () => {
  it('maps Firestore raw doc to API project shape', async () => {
    const getter = createFirestoreProjectGetter({
      getRaw: async (id: string) =>
        id === 'proj_1'
          ? { id: 'proj_1', data: { address: '123 Main', status: 'fund' } }
          : null,
    });

    const project = await getter('proj_1');
    expect(project).toEqual({
      id: 'proj_1',
      project_id: 'proj_1',
      address: '123 Main',
      status: 'fund',
    });
  });
});
