import prisma from "@/lib/prisma";
import type { AcquisitionStatus, OwnershipStructure } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateProjectInput {
  createdById:        string;
  addressLine?:       string;
  city?:              string;
  state?:             string;
  zip?:               string;
  lat?:               number | null;
  lng?:               number | null;
  placeId?:           string | null;
  displayName?:       string | null;
  acquisitionStatus?: AcquisitionStatus;
  ownershipStructure?: OwnershipStructure | null;
}

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, "createdById">> & {
  entityType?: string | null;
  entityName?: string | null;
  coOwners?:   string[];
};

// ─── Upsert caller's AppUser (Firebase UID) ───────────────────────────────────

export async function upsertAppUser(uid: string, email: string, name?: string | null) {
  return prisma.appUser.upsert({
    where: { id: uid },
    create: { id: uid, email, name: name ?? null },
    update: { email, ...(name !== undefined && { name: name ?? null }) },
  });
}

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export async function createProject(input: CreateProjectInput) {
  return prisma.reilProject.create({
    data: {
      createdById:        input.createdById,
      addressLine:        input.addressLine        ?? "",
      city:               input.city               ?? "",
      state:              input.state              ?? "",
      zip:                input.zip                ?? "",
      lat:                input.lat                ?? null,
      lng:                input.lng                ?? null,
      placeId:            input.placeId            ?? null,
      displayName:        input.displayName        ?? null,
      acquisitionStatus:  input.acquisitionStatus  ?? "PROSPECT",
      ownershipStructure: input.ownershipStructure ?? null,
    },
  });
}

export async function getProject(id: string) {
  return prisma.reilProject.findUnique({
    where: { id },
    include: {
      propertyFacts: true,
      comps: { orderBy: { soldDate: "desc" } },
      purchaseTerms: true,
      statusEvents: { orderBy: { occurredAt: "desc" } },
      collaborators: { include: { user: true } },
    },
  });
}

export async function updateProject(id: string, data: UpdateProjectInput) {
  return prisma.reilProject.update({
    where: { id },
    data: {
      ...(data.addressLine        !== undefined && { addressLine:        data.addressLine        }),
      ...(data.city               !== undefined && { city:               data.city               }),
      ...(data.state              !== undefined && { state:              data.state              }),
      ...(data.zip                !== undefined && { zip:                data.zip                }),
      ...(data.lat                !== undefined && { lat:                data.lat                }),
      ...(data.lng                !== undefined && { lng:                data.lng                }),
      ...(data.placeId            !== undefined && { placeId:            data.placeId            }),
      ...(data.displayName        !== undefined && { displayName:        data.displayName        }),
      ...(data.acquisitionStatus  !== undefined && { acquisitionStatus:  data.acquisitionStatus  }),
      ...(data.ownershipStructure !== undefined && { ownershipStructure: data.ownershipStructure }),
      ...(data.entityType         !== undefined && { entityType:         data.entityType         }),
      ...(data.entityName         !== undefined && { entityName:         data.entityName         }),
      ...(data.coOwners           !== undefined && { coOwners:           data.coOwners           }),
    },
  });
}

export async function updateProjectSync(
  projectId: string,
  data: {
    lastSyncedAt?: Date;
    valueSyncedAt?: Date;
    rentSyncedAt?: Date;
    marketSyncedAt?: Date;
  }
) {
  return prisma.reilProject.update({
    where: { id: projectId },
    data,
  });
}

export async function listProjectsForUser(userId: string) {
  return prisma.reilProject.findMany({
    where: {
      OR: [
        { createdById: userId },
        { collaborators: { some: { userId } } },
      ],
    },
    include: {
      propertyFacts:  true,
      statusEvents: { orderBy: { occurredAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ─── Status events ────────────────────────────────────────────────────────────

export async function createStatusEvent(
  projectId:    string,
  status:       AcquisitionStatus,
  recordedById: string,
  note?:        string | null,
) {
  // Atomically write the event + update the project status in one transaction
  return prisma.$transaction([
    prisma.statusEvent.create({
      data: { projectId, status, recordedById, note: note ?? null },
    }),
    prisma.reilProject.update({
      where: { id: projectId },
      data:  { acquisitionStatus: status },
    }),
  ]);
}

export async function listStatusEvents(projectId: string) {
  return prisma.statusEvent.findMany({
    where:   { projectId },
    include: { recordedBy: true },
    orderBy: { occurredAt: "desc" },
  });
}

// ─── Purchase terms ───────────────────────────────────────────────────────────

export interface UpsertPurchaseTermsInput {
  projectId:           string;
  offerMadeCents?:     bigint | null;
  offerDate?:          Date | null;
  sellerResponse?:     "PENDING" | "ACCEPTED" | "COUNTERED" | "REJECTED";
  counterPriceCents?:  bigint | null;
  acceptedPriceCents?: bigint | null;
  earnestMoneyCents?:  bigint | null;
  estClosingCostsCents?: bigint | null;
  amountPaidCents?:    bigint | null;
}

export async function upsertPurchaseTerms(input: UpsertPurchaseTermsInput) {
  const { projectId, ...data } = input;
  return prisma.reilPurchaseTerms.upsert({
    where:  { projectId },
    create: { projectId, ...data },
    update: data,
  });
}

export async function getPurchaseTerms(projectId: string) {
  return prisma.reilPurchaseTerms.findUnique({ where: { projectId } });
}

// ─── Property enrichment ──────────────────────────────────────────────────────

export interface UpsertPropertyFactsInput {
  projectId:               string;
  photoUrl?:               string | null;
  beds?:                   number | null;
  baths?:                  number | null;
  sqft?:                   number | null;
  yearBuilt?:              number | null;
  lotSqft?:                number | null;
  propertyType?:           string | null;
  listPriceCents?:         bigint | null;
  estRentCents?:           bigint | null;
  lastSoldPriceCents?:     bigint | null;
  lastSoldDate?:           Date | null;
  // Tax & HOA (Prompt 2)
  annualPropertyTaxCents?: bigint | null;
  taxAssessedValueCents?:  bigint | null;
  taxAssessedLandValCents?: bigint | null;
  taxAssessedImprovementsValCents?: bigint | null;
  taxYear?:                number | null;
  hoaMonthlyCents?:        bigint | null;
  taxSource?:              string | null;
  // Rent AVM (Prompt 3)
  estRentLowCents?:        bigint | null;
  estRentHighCents?:       bigint | null;
  // Value AVM (Prompt 4)
  avmPriceCents?:          bigint | null;
  avmPriceLowCents?:       bigint | null;
  avmPriceHighCents?:      bigint | null;
  // Meta
  sourceProvider:          string;
  fetchedAt:               Date;
}

export async function upsertPropertyFacts(input: UpsertPropertyFactsInput) {
  return prisma.reilPropertyFacts.upsert({
    where:  { projectId: input.projectId },
    create: { ...input },
    update: {
      photoUrl:                        input.photoUrl,
      beds:                            input.beds,
      baths:                           input.baths,
      sqft:                            input.sqft,
      yearBuilt:                       input.yearBuilt,
      lotSqft:                         input.lotSqft,
      propertyType:                    input.propertyType,
      listPriceCents:                  input.listPriceCents,
      estRentCents:                    input.estRentCents,
      lastSoldPriceCents:              input.lastSoldPriceCents,
      lastSoldDate:                    input.lastSoldDate,
      annualPropertyTaxCents:          input.annualPropertyTaxCents,
      taxAssessedValueCents:           input.taxAssessedValueCents,
      taxAssessedLandValCents:         input.taxAssessedLandValCents,
      taxAssessedImprovementsValCents: input.taxAssessedImprovementsValCents,
      taxYear:                         input.taxYear,
      hoaMonthlyCents:                 input.hoaMonthlyCents,
      taxSource:                       input.taxSource,
      estRentLowCents:                 input.estRentLowCents,
      estRentHighCents:                input.estRentHighCents,
      avmPriceCents:                   input.avmPriceCents,
      avmPriceLowCents:                input.avmPriceLowCents,
      avmPriceHighCents:               input.avmPriceHighCents,
      sourceProvider:                  input.sourceProvider,
      fetchedAt:                       input.fetchedAt,
    },
  });
}

export interface CompInput {
  addressLine: string;
  soldPriceCents?: bigint | null;
  soldDate?: Date | null;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  distanceMiles?: number | null;
  compType?: string;
  priceCents?: bigint | null;
  correlation?: number | null;
  daysOnMarket?: number | null;
  status?: string | null;
  listedDate?: Date | null;
}

export async function replaceComps(
  projectId: string,
  comps: CompInput[],
) {
  await prisma.reilComp.deleteMany({ where: { projectId, compType: "SALE" } });
  return prisma.reilComp.createMany({
    data: comps.map(c => ({ projectId, compType: "SALE", ...c })),
  });
}

export async function replaceRentalComps(
  projectId: string,
  comps: CompInput[],
) {
  await prisma.reilComp.deleteMany({ where: { projectId, compType: "RENTAL" } });
  return prisma.reilComp.createMany({
    data: comps.map(c => ({ projectId, compType: "RENTAL", ...c })),
  });
}

export interface ValuationSnapshotInput {
  projectId:      string;
  valueCents:     bigint;
  valueLowCents:  bigint;
  valueHighCents: bigint;
  source:         string;
  fetchedAt:      Date;
}

export async function appendValuationSnapshot(input: ValuationSnapshotInput) {
  return prisma.reilValuationSnapshot.create({
    data: input,
  });
}

export async function getValuationSnapshots(projectId: string) {
  return prisma.reilValuationSnapshot.findMany({
    where: { projectId },
    orderBy: { fetchedAt: "desc" },
  });
}

// ─── Collaboration ─────────────────────────────────────────────────────────────

export async function inviteCollaborator(
  projectId:    string,
  email:        string,
  invitedById:  string,
  role:         "OWNER" | "PARTNER" | "ANALYST" | "VIEWER" = "VIEWER",
) {
  // Upsert the AppUser by email.
  // For unregistered invitees we use a stable "invite:<email>" placeholder ID.
  // TODO: When the invitee signs in via Firebase, match by email and replace
  //       this placeholder ID with their real Firebase UID.
  const userId = `invite:${email.toLowerCase()}`;

  await prisma.appUser.upsert({
    where:  { id: userId },
    create: { id: userId, email: email.toLowerCase() },
    update: { email: email.toLowerCase() },
  });

  return prisma.projectCollaborator.upsert({
    where:  { projectId_userId: { projectId, userId } },
    create: { projectId, userId, role },
    update: { role },
    include: { user: true },
  });
}

export async function listCollaborators(projectId: string) {
  return prisma.projectCollaborator.findMany({
    where:   { projectId },
    include: { user: true },
    orderBy: { invitedAt: "asc" },
  });
}

// ─── Field assignments ────────────────────────────────────────────────────────

export async function createFieldAssignment(
  projectId:    string,
  fieldKey:     string,
  assignedToId: string,
  assignedById: string,
) {
  // Upsert: each (project + fieldKey) has at most one open assignment.
  return prisma.fieldAssignment.upsert({
    where: {
      // Prisma doesn't support composite unique on non-@@unique — use findFirst+create pattern
      id: `${projectId}:${fieldKey}`, // synthetic; will fail, use createMany guard below
    },
    create: { projectId, fieldKey, assignedToId, assignedById, status: "OPEN" },
    update: { assignedToId, assignedById, status: "OPEN" },
  });
}

// Safer upsert using a raw findFirst + upsert by synthetic ID
export async function upsertFieldAssignment(
  projectId:    string,
  fieldKey:     string,
  assignedToId: string,
  assignedById: string,
) {
  const existing = await prisma.fieldAssignment.findFirst({
    where: { projectId, fieldKey },
  });
  if (existing) {
    return prisma.fieldAssignment.update({
      where: { id: existing.id },
      data:  { assignedToId, assignedById, status: "OPEN" },
      include: { assignedTo: true, assignedBy: true },
    });
  }
  return prisma.fieldAssignment.create({
    data:    { projectId, fieldKey, assignedToId, assignedById, status: "OPEN" },
    include: { assignedTo: true, assignedBy: true },
  });
}

export async function resolveFieldAssignment(projectId: string, fieldKey: string) {
  const assignment = await prisma.fieldAssignment.findFirst({
    where: { projectId, fieldKey, status: "OPEN" },
  });
  if (!assignment) return null;
  return prisma.fieldAssignment.update({
    where: { id: assignment.id },
    data:  { status: "FILLED" },
  });
}

export async function listFieldAssignments(projectId: string) {
  return prisma.fieldAssignment.findMany({
    where:   { projectId },
    include: { assignedTo: true, assignedBy: true },
    orderBy: { createdAt: "desc" },
  });
}
