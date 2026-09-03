import type { ApiPrismaClient } from '../client.js';
import {
  NEST_PROJECT_SUBCOLLECTION_ALLOWLIST,
  type NestProjectSubcollectionName,
} from '../firestore/create-firestore-projects-nest-legacy-repository.js';

const PHASE_MAP: Record<string, number> = {
  acquisition: 1,
  purchase: 2,
  hold: 3,
  exit: 4,
};

const PHASE_NAMES = ['', 'acquisition', 'purchase', 'hold', 'exit'] as const;

export { NEST_PROJECT_SUBCOLLECTION_ALLOWLIST, type NestProjectSubcollectionName };

/** Prisma-backed Nest project advanced operations (postgres fallback). */
export function createPrismaProjectsNestLegacyRepository(prisma: ApiPrismaClient) {
  return {
    phaseNameToNumber(phase: string): number {
      const n = PHASE_MAP[phase.toLowerCase()];
      if (!n) throw new Error(`Unknown phase: ${phase}`);
      return n;
    },

    phaseNumberToName(n: number): string {
      return PHASE_NAMES[n] || 'acquisition';
    },

    async mergePhase(
      id: string,
      phase: string,
      body: Record<string, unknown>,
      userUid: string,
    ) {
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) throw new Error('Project not found');
      const phaseKey = phase.toLowerCase();
      this.phaseNameToNumber(phaseKey);
      const existing =
        project.phaseData && typeof project.phaseData === 'object'
          ? { ...(project.phaseData as Record<string, unknown>) }
          : {};
      const prevPhase = this.phaseNumberToName(project.currentPhase);
      const currentPhasePayload =
        existing[phaseKey] && typeof existing[phaseKey] === 'object'
          ? { ...(existing[phaseKey] as Record<string, unknown>) }
          : {};
      existing[phaseKey] = { ...currentPhasePayload, ...body };
      const updated = await prisma.project.update({
        where: { id },
        data: {
          phaseData: existing,
          currentPhase: this.phaseNameToNumber(phaseKey),
        },
      });
      await prisma.phaseTransition.create({
        data: {
          linkedProjectId: id,
          fromPhase: prevPhase,
          toPhase: phaseKey,
          userUid,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
        },
      });
      return updated;
    },

    async getHoldRegistry(id: string) {
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) throw new Error('Project not found');
      const phaseData = (project.phaseData as Record<string, unknown> | null) || {};
      const hold = (phaseData.hold as Record<string, unknown> | undefined) || {};
      return hold.registry ?? { units: [], updatedAt: null };
    },

    async patchHoldRegistry(id: string, registry: unknown) {
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) throw new Error('Project not found');
      const phaseData =
        project.phaseData && typeof project.phaseData === 'object'
          ? { ...(project.phaseData as Record<string, unknown>) }
          : {};
      const hold =
        phaseData.hold && typeof phaseData.hold === 'object'
          ? { ...(phaseData.hold as Record<string, unknown>) }
          : {};
      hold.registry = registry;
      phaseData.hold = hold;
      return prisma.project.update({
        where: { id },
        data: { phaseData },
      });
    },

    async getSubcollection(projectId: string, name: NestProjectSubcollectionName) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new Error('Project not found');
      const subs = (project.subcollections as Record<string, unknown> | null) || {};
      const value = subs[name];
      return Array.isArray(value) ? value : value ?? [];
    },

    async appendSubcollection(
      projectId: string,
      name: NestProjectSubcollectionName,
      item: Record<string, unknown>,
    ) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new Error('Project not found');
      const subs =
        project.subcollections && typeof project.subcollections === 'object'
          ? { ...(project.subcollections as Record<string, unknown>) }
          : {};
      const current = Array.isArray(subs[name]) ? [...(subs[name] as unknown[])] : [];
      const entry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...item,
      };
      current.push(entry);
      subs[name] = current;
      await prisma.project.update({
        where: { id: projectId },
        data: { subcollections: subs },
      });
      return entry;
    },
  };
}
