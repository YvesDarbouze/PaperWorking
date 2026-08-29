import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const PHASE_MAP: Record<string, number> = {
  acquisition: 1,
  purchase: 2,
  hold: 3,
  exit: 4,
};

const PHASE_NAMES = ['', 'acquisition', 'purchase', 'hold', 'exit'] as const;

export const SUBCOLLECTION_ALLOWLIST = [
  'vendorRequests',
  'commitments',
  'activityLog',
  'phaseSnapshots',
] as const;

export type SubcollectionName = (typeof SUBCOLLECTION_ALLOWLIST)[number];

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q?: string, orgIds: string[] = []) {
    const accessOr: Array<Record<string, unknown>> = [
      { userId },
      { investorId: userId },
      { members: { some: { userId, status: 'active' } } },
    ];
    if (orgIds.length > 0) {
      accessOr.push({ organizationId: { in: orgIds } });
    }
    const where = q?.trim()
      ? {
          OR: accessOr,
          AND: [
            {
              OR: [
                { name: { contains: q.trim(), mode: 'insensitive' as const } },
                { title: { contains: q.trim(), mode: 'insensitive' as const } },
                { address: { contains: q.trim(), mode: 'insensitive' as const } },
                { city: { contains: q.trim(), mode: 'insensitive' as const } },
              ],
            },
          ],
        }
      : { OR: accessOr };
    return this.prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(data: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    purchasePrice?: number;
    organizationId?: string;
    userId: string;
  }) {
    return this.prisma.project.create({
      data: {
        name: data.name,
        title: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        purchasePrice: data.purchasePrice,
        organizationId: data.organizationId,
        userId: data.userId,
        investorId: data.userId,
        currentPhase: 1,
        phaseData: {},
        subcollections: {},
      },
    });
  }

  async findById(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException({ error: 'Project not found' });
    return project;
  }

  async update(id: string, patch: Record<string, unknown>) {
    await this.findById(id);
    return this.prisma.project.update({
      where: { id },
      data: patch,
    });
  }

  phaseNameToNumber(phase: string): number {
    const n = PHASE_MAP[phase.toLowerCase()];
    if (!n) throw new NotFoundException({ error: `Unknown phase: ${phase}` });
    return n;
  }

  phaseNumberToName(n: number): string {
    return PHASE_NAMES[n] || 'acquisition';
  }

  async mergePhase(
    id: string,
    phase: string,
    body: Record<string, unknown>,
    userUid: string,
  ) {
    const project = await this.findById(id);
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
    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        phaseData: existing,
        currentPhase: this.phaseNameToNumber(phaseKey),
      },
    });
    await this.prisma.phaseTransition.create({
      data: {
        linkedProjectId: id,
        fromPhase: prevPhase,
        toPhase: phaseKey,
        userUid,
        notes: typeof body.notes === 'string' ? body.notes : undefined,
      },
    });
    return updated;
  }

  async getHoldRegistry(id: string) {
    const project = await this.findById(id);
    const phaseData =
      (project.phaseData as Record<string, unknown> | null) || {};
    const hold = (phaseData.hold as Record<string, unknown> | undefined) || {};
    return hold.registry ?? { units: [], updatedAt: null };
  }

  async patchHoldRegistry(id: string, registry: unknown) {
    const project = await this.findById(id);
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
    return this.prisma.project.update({
      where: { id },
      data: { phaseData },
    });
  }

  async listDocuments(projectId: string) {
    await this.findById(projectId);
    return this.prisma.projectDocument.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocument(
    projectId: string,
    data: {
      name: string;
      mimeType?: string;
      storageKey?: string;
      sizeBytes?: number;
      uploadedBy?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.findById(projectId);
    return this.prisma.projectDocument.create({
      data: {
        projectId,
        name: data.name,
        mimeType: data.mimeType,
        storageKey: data.storageKey ?? `projects/${projectId}/${Date.now()}-${data.name}`,
        sizeBytes: data.sizeBytes,
        uploadedBy: data.uploadedBy,
        metadata: data.metadata ?? {},
      },
    });
  }

  async getDocument(projectId: string, docId: string) {
    const doc = await this.prisma.projectDocument.findFirst({
      where: { id: docId, projectId },
    });
    if (!doc) throw new NotFoundException({ error: 'Document not found' });
    return doc;
  }

  async getSubcollection(projectId: string, name: SubcollectionName) {
    const project = await this.findById(projectId);
    const subs =
      (project.subcollections as Record<string, unknown> | null) || {};
    const value = subs[name];
    return Array.isArray(value) ? value : value ?? [];
  }

  async appendSubcollection(
    projectId: string,
    name: SubcollectionName,
    item: Record<string, unknown>,
  ) {
    const project = await this.findById(projectId);
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
    await this.prisma.project.update({
      where: { id: projectId },
      data: { subcollections: subs },
    });
    return entry;
  }
}
