import { Injectable, NotFoundException } from '@nestjs/common';
import {
  createProjectsNestLegacyRepository,
  NEST_PROJECT_SUBCOLLECTION_ALLOWLIST,
  type NestProjectSubcollectionName,
} from '@paperworking/database';

export const SUBCOLLECTION_ALLOWLIST = NEST_PROJECT_SUBCOLLECTION_ALLOWLIST;
export type SubcollectionName = NestProjectSubcollectionName;

/**
 * Nest-only advanced project operations (phases, hold registry, subcollections).
 * Main project CRUD uses shared ProjectsRead/Command services.
 */
@Injectable()
export class ProjectsRepository {
  private readonly legacy;

  constructor() {
    this.legacy = createProjectsNestLegacyRepository();
  }

  phaseNameToNumber(phase: string): number {
    return this.legacy.phaseNameToNumber(phase);
  }

  phaseNumberToName(n: number): string {
    return this.legacy.phaseNumberToName(n);
  }

  async mergePhase(
    id: string,
    phase: string,
    body: Record<string, unknown>,
    userUid: string,
  ) {
    try {
      return await this.legacy.mergePhase(id, phase, body, userUid);
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        throw new NotFoundException({ error: 'Project not found' });
      }
      if (error instanceof Error && error.message.startsWith('Unknown phase:')) {
        throw new NotFoundException({ error: error.message });
      }
      throw error;
    }
  }

  async getHoldRegistry(id: string) {
    try {
      return await this.legacy.getHoldRegistry(id);
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        throw new NotFoundException({ error: 'Project not found' });
      }
      throw error;
    }
  }

  async patchHoldRegistry(id: string, registry: unknown) {
    try {
      return await this.legacy.patchHoldRegistry(id, registry);
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        throw new NotFoundException({ error: 'Project not found' });
      }
      throw error;
    }
  }

  async getSubcollection(projectId: string, name: SubcollectionName) {
    try {
      return await this.legacy.getSubcollection(projectId, name);
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        throw new NotFoundException({ error: 'Project not found' });
      }
      throw error;
    }
  }

  async appendSubcollection(
    projectId: string,
    name: SubcollectionName,
    item: Record<string, unknown>,
  ) {
    try {
      return await this.legacy.appendSubcollection(projectId, name, item);
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        throw new NotFoundException({ error: 'Project not found' });
      }
      throw error;
    }
  }
}
