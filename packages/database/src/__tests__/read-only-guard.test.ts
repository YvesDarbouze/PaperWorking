import { describe, expect, it, jest } from '@jest/globals';
import { ReadOnlyDatabaseError, asReadOnlyClient } from '../read-only-guard.js';

describe('read-only guard', () => {
  const mockDelegate = {
    findUnique: jest.fn().mockResolvedValue({ id: '1' }),
    create: jest.fn().mockResolvedValue({ id: '1' }),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockClient = {
    reilProject: mockDelegate,
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  };

  it('allows read operations', async () => {
    const client = asReadOnlyClient(mockClient);
    await expect(client.reilProject.findUnique({ where: { id: '1' } })).resolves.toEqual({ id: '1' });
  });

  it('blocks create/update/delete on model delegates', () => {
    const client = asReadOnlyClient(mockClient);

    expect(() => client.reilProject.create({ data: {} as never })).toThrow(ReadOnlyDatabaseError);
    expect(() => client.reilProject.update({ where: { id: '1' }, data: {} })).toThrow(
      ReadOnlyDatabaseError,
    );
    expect(() => client.reilProject.delete({ where: { id: '1' } })).toThrow(ReadOnlyDatabaseError);
  });

  it('blocks $executeRaw on client', () => {
    const client = asReadOnlyClient(mockClient);
    expect(() => client.$executeRaw`SELECT 1`).toThrow(ReadOnlyDatabaseError);
  });
});
