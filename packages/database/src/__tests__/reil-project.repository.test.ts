import { describe, expect, it, jest } from '@jest/globals';
import { ReilProjectRepository } from '../repositories/reil-project.repository.js';

describe('ReilProjectRepository', () => {
  it('findById returns sanitized project with relations', async () => {
    const mockProject = {
      id: 'proj_1',
      organizationId: 'org_1',
      askingPriceCents: BigInt(25000000),
      propertyFacts: null,
      comps: [],
      purchaseTerms: null,
      statusEvents: [],
      collaborators: [],
    };

    const db = {
      reilProject: {
        findUnique: jest.fn().mockResolvedValue(mockProject),
      },
    };

    const repo = new ReilProjectRepository(db as never);
    const result = await repo.findById('proj_1');

    expect(db.reilProject.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'proj_1' } }),
    );
    expect(result?.askingPriceCents).toBe(25000000);
  });

  it('findById returns null when missing', async () => {
    const db = {
      reilProject: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const repo = new ReilProjectRepository(db as never);
    await expect(repo.findById('missing')).resolves.toBeNull();
  });
});
