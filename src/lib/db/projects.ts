import prisma from "@/lib/prisma";
import type { AcquisitionStatus, OwnershipStructure } from "@prisma/client";
import fs from "fs";
import path from "path";

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
  currentPhase?:      number;
  dispositionType?:   string | null;
  subStrategy?:       string | null;
  holdHorizon?:       number | null;
  exitAssumption?:    string | null;
  entryStage?:        string | null;
  lastActiveStage?:   string | null;
  overrideReason?:    string | null;
  propertyType?:      string | null;
  units?:             number | null;
  condition?:         string | null;
  retrospective?:     boolean;
  apn?:               string | null;
  sqft?:              number | null;
  lotSqft?:           number | null;
  yearBuilt?:         number | null;

  // AQ-5 fields
  leadSource?:        string | null;
  listingUrl?:        string | null;
  askingPriceCents?:  bigint | number | null;
  subjectDom?:        number | null;
  leadAgent?:         string | null;
  dateIdentified?:    Date | string | null;
  sellerName?:        string | null;
  sellerType?:        string | null;
  sellerMotivation?:  string | null;
  sellerContact?:     string | null;
  submarket?:         string | null;
  medianSalesPriceCents?: bigint | number | null;
  medianRentCents?:   bigint | number | null;
  marketVacancyRate?: number | null;
  hazardFlag?:        boolean | null;
  hazardNote?:        string | null;

  // AQ-6 fields
  firstPassRentCents?: bigint | number | null;
  firstPassVerdict?:   string | null;

  // AQ-7 fields
  arvCents?:           bigint | number | null;
  comps?:              any[];
}

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, "createdById">> & {
  entityType?: string | null;
  entityName?: string | null;
  coOwners?:   string[];
  status?:     string | null;
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
      currentPhase:       input.currentPhase       ?? 1,
      dispositionType:    input.dispositionType    ?? null,
      subStrategy:        input.subStrategy        ?? null,
      holdHorizon:        input.holdHorizon        ?? null,
      exitAssumption:     input.exitAssumption     ?? null,
      entryStage:         input.entryStage         ?? null,
      lastActiveStage:    input.lastActiveStage    ?? null,
      overrideReason:     input.overrideReason     ?? null,
      propertyType:       input.propertyType       ?? null,
      units:              input.units              ?? null,
      condition:          input.condition          ?? null,
      retrospective:      input.retrospective      ?? false,

      // AQ-5 mapping
      leadSource:         input.leadSource         ?? null,
      listingUrl:         input.listingUrl         ?? null,
      askingPriceCents:   toBigInt(input.askingPriceCents),
      subjectDom:         input.subjectDom         ?? null,
      leadAgent:          input.leadAgent          ?? null,
      dateIdentified:     toDate(input.dateIdentified),
      sellerName:         input.sellerName         ?? null,
      sellerType:         input.sellerType         ?? null,
      sellerMotivation:   input.sellerMotivation   ?? null,
      sellerContact:      input.sellerContact      ?? null,
      submarket:          input.submarket          ?? null,
      medianSalesPriceCents: toBigInt(input.medianSalesPriceCents),
      medianRentCents:    toBigInt(input.medianRentCents),
      marketVacancyRate:  input.marketVacancyRate  ?? null,
      hazardFlag:         input.hazardFlag         ?? false,
      hazardNote:         input.hazardNote         ?? null,

      // AQ-6 mapping
      firstPassRentCents: toBigInt(input.firstPassRentCents),
      firstPassVerdict:   input.firstPassVerdict   ?? null,

      // AQ-7 mapping
      arvCents:           toBigInt(input.arvCents),
      // Target Details nested creation (AQ-4)
      ...((input.apn !== undefined || input.sqft !== undefined || input.lotSqft !== undefined || input.yearBuilt !== undefined || input.propertyType !== undefined) && {
        propertyFacts: {
          create: {
            apn: input.apn ?? null,
            sqft: input.sqft ?? null,
            lotSqft: input.lotSqft ?? null,
            yearBuilt: input.yearBuilt ?? null,
            propertyType: input.propertyType ?? null,
            sourceProvider: 'user',
            fetchedAt: new Date(),
          }
        }
      }),
      comps: {
        create: (input.comps !== undefined ? input.comps : [
          { addressLine: "123 Comp St", soldPriceCents: 25000000, soldDate: "2026-01-01", sqft: 1500, distanceMiles: 0.5, condition: "Good" },
          { addressLine: "456 Comp St", soldPriceCents: 28000000, soldDate: "2026-01-01", sqft: 1600, distanceMiles: 0.8, condition: "Good" },
          { addressLine: "789 Comp St", soldPriceCents: 32000000, soldDate: "2026-01-01", sqft: 1700, distanceMiles: 1.2, condition: "Good" }
        ]).map((c: any) => ({
          addressLine: c.addressLine || '',
          soldPriceCents: c.soldPriceCents ? BigInt(c.soldPriceCents) : null,
          soldDate: c.soldDate ? new Date(c.soldDate) : null,
          beds: c.beds || null,
          baths: c.baths || null,
          sqft: c.sqft || null,
          distanceMiles: c.distanceMiles || null,
          compType: c.compType || 'SALE',
          correlation: c.correlation || null,
          daysOnMarket: c.daysOnMarket || null,
          listedDate: c.listedDate ? new Date(c.listedDate) : null,
          priceCents: c.priceCents ? BigInt(c.priceCents) : null,
          status: c.status || null,
          condition: c.condition || null,
        })),
      },
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

const CACHE_FILE = path.join(process.cwd(), 'src/lib/db/financials_cache_store.json');

function readCacheFromFile(): Record<string, any> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read financials cache file:', err);
  }
  return {};
}

function writeCacheToFile(cache: Record<string, any>) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write financials cache file:', err);
  }
}

export function getCachedFinancials(projectId: string) {
  const cache = readCacheFromFile();
  if (!cache[projectId]) {
    cache[projectId] = {
      costs: [],
    };
    writeCacheToFile(cache);
  }
  return cache[projectId];
}

export function cacheFinancials(projectId: string, data: any) {
  const cache = readCacheFromFile();
  if (!cache[projectId]) {
    cache[projectId] = {
      costs: [],
    };
  }
  const current = cache[projectId];
  
  if (data.financials && typeof data.financials === 'object') {
    Object.assign(current, data.financials);
  }
  
  for (const key of Object.keys(data)) {
    if (key.startsWith('financials.')) {
      const subKey = key.slice('financials.'.length);
      current[subKey] = data[key];
    }
  }
  
  cache[projectId] = current;
  writeCacheToFile(cache);
}

export async function updateProject(id: string, data: UpdateProjectInput) {
  cacheFinancials(id, data);

  let finalAcquisitionStatus = data.acquisitionStatus;
  if (data.status !== undefined && data.status !== null) {
    if (data.status === 'closed_lost') {
      finalAcquisitionStatus = 'DEAD';
    } else if (data.status === 'closed_won') {
      finalAcquisitionStatus = 'CLOSED';
    } else if (data.status === 'Active') {
      finalAcquisitionStatus = 'UNDERWRITING';
    } else if (data.status === 'Lead') {
      finalAcquisitionStatus = 'PROSPECT';
    }
  }

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
      ...(finalAcquisitionStatus  !== undefined && { acquisitionStatus:  finalAcquisitionStatus  }),
      ...(data.ownershipStructure !== undefined && { ownershipStructure: data.ownershipStructure }),
      ...(data.entityType         !== undefined && { entityType:         data.entityType         }),
      ...(data.entityName         !== undefined && { entityName:         data.entityName         }),
      ...(data.coOwners           !== undefined && { coOwners:           data.coOwners           }),
      ...(data.currentPhase       !== undefined && { currentPhase:       data.currentPhase       }),
      ...(data.dispositionType    !== undefined && { dispositionType:    data.dispositionType    }),
      ...(data.subStrategy        !== undefined && { subStrategy:        data.subStrategy        }),
      ...(data.holdHorizon        !== undefined && { holdHorizon:        data.holdHorizon        }),
      ...(data.exitAssumption     !== undefined && { exitAssumption:     data.exitAssumption     }),
      ...(data.entryStage         !== undefined && { entryStage:         data.entryStage         }),
      ...(data.lastActiveStage    !== undefined && { lastActiveStage:    data.lastActiveStage    }),
      ...(data.overrideReason     !== undefined && { overrideReason:     data.overrideReason     }),
      ...(data.propertyType       !== undefined && { propertyType:       data.propertyType       }),
      ...(data.units              !== undefined && { units:              data.units              }),
      ...(data.condition          !== undefined && { condition:          data.condition          }),
      ...(data.retrospective      !== undefined && { retrospective:      data.retrospective      }),
      // Target Details nested update / upsert (AQ-4)
      ...((data.apn !== undefined || data.sqft !== undefined || data.lotSqft !== undefined || data.yearBuilt !== undefined || data.propertyType !== undefined) && {
        propertyFacts: {
          upsert: {
            create: {
              apn: data.apn ?? null,
              sqft: data.sqft ?? null,
              lotSqft: data.lotSqft ?? null,
              yearBuilt: data.yearBuilt ?? null,
              propertyType: data.propertyType ?? null,
              sourceProvider: 'user',
              fetchedAt: new Date(),
            },
            update: {
              ...(data.apn !== undefined && { apn: data.apn }),
              ...(data.sqft !== undefined && { sqft: data.sqft }),
              ...(data.lotSqft !== undefined && { lotSqft: data.lotSqft }),
              ...(data.yearBuilt !== undefined && { yearBuilt: data.yearBuilt }),
              ...(data.propertyType !== undefined && { propertyType: data.propertyType }),
            }
          }
        }
      }),

      // AQ-5 mapping
      ...(data.leadSource         !== undefined && { leadSource:         data.leadSource         }),
      ...(data.listingUrl         !== undefined && { listingUrl:         data.listingUrl         }),
      ...(data.askingPriceCents   !== undefined && { askingPriceCents:   toBigInt(data.askingPriceCents) }),
      ...(data.subjectDom         !== undefined && { subjectDom:         data.subjectDom         }),
      ...(data.leadAgent          !== undefined && { leadAgent:          data.leadAgent          }),
      ...(data.dateIdentified     !== undefined && { dateIdentified:     toDate(data.dateIdentified) }),
      ...(data.sellerName         !== undefined && { sellerName:         data.sellerName         }),
      ...(data.sellerType         !== undefined && { sellerType:         data.sellerType         }),
      ...(data.sellerMotivation   !== undefined && { sellerMotivation:   data.sellerMotivation   }),
      ...(data.sellerContact      !== undefined && { sellerContact:      data.sellerContact      }),
      ...(data.submarket          !== undefined && { submarket:          data.submarket          }),
      ...(data.medianSalesPriceCents !== undefined && { medianSalesPriceCents: toBigInt(data.medianSalesPriceCents) }),
      ...(data.medianRentCents    !== undefined && { medianRentCents:    toBigInt(data.medianRentCents) }),
      ...(data.marketVacancyRate  !== undefined && { marketVacancyRate:  data.marketVacancyRate  }),
      ...(data.hazardFlag         !== undefined && { hazardFlag:         data.hazardFlag ?? false }),
      ...(data.hazardNote         !== undefined && { hazardNote:         data.hazardNote         }),

      // AQ-6 mapping
      ...(data.firstPassRentCents !== undefined && { firstPassRentCents: toBigInt(data.firstPassRentCents) }),
      ...(data.firstPassVerdict   !== undefined && { firstPassVerdict:   data.firstPassVerdict   }),

      // AQ-7 mapping
      ...(data.arvCents !== undefined && { arvCents: toBigInt(data.arvCents) }),
      ...(data.comps !== undefined && {
        comps: {
          deleteMany: {},
          create: data.comps.map((c: any) => ({
            addressLine: c.addressLine || '',
            soldPriceCents: c.soldPriceCents ? BigInt(c.soldPriceCents) : null,
            soldDate: c.soldDate ? new Date(c.soldDate) : null,
            beds: c.beds || null,
            baths: c.baths || null,
            sqft: c.sqft || null,
            distanceMiles: c.distanceMiles || null,
            compType: c.compType || 'SALE',
            correlation: c.correlation || null,
            daysOnMarket: c.daysOnMarket || null,
            listedDate: c.listedDate ? new Date(c.listedDate) : null,
            priceCents: c.priceCents ? BigInt(c.priceCents) : null,
            status: c.status || null,
            condition: c.condition || null,
          })),
        },
      }),
    },
    include: {
      propertyFacts: true,
      purchaseTerms: true,
      statusEvents: { orderBy: { occurredAt: "desc" }, take: 1 },
      collaborators: { include: { user: true } },
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
      purchaseTerms:  true,
      statusEvents: { orderBy: { occurredAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function mapPostgresProjectToFrontend(project: any) {
  if (!project) return null;
  
  const cached = getCachedFinancials(project.id);
  const financials: any = {
    costs: [],
    ...cached,
    purchasePrice: project.purchaseTerms?.acceptedPriceCents 
      ? Number(project.purchaseTerms.acceptedPriceCents) / 100 
      : (cached.purchasePrice || (project.askingPriceCents ? Number(project.askingPriceCents) / 100 : 0) || cached.listedPrice || cached.targetPurchasePrice || 0),
    estimatedARV: project.arvCents 
      ? Number(project.arvCents) / 100 
      : (project.propertyFacts?.avmPriceCents 
          ? Number(project.propertyFacts.avmPriceCents) / 100 
          : (cached.estimatedARV || 0)),
    offer_price: project.purchaseTerms?.offerMadeCents 
      ? Number(project.purchaseTerms.offerMadeCents) / 100 
      : (cached.offer_price || undefined),
    acceptedPriceCents: project.purchaseTerms?.acceptedPriceCents 
      ? Number(project.purchaseTerms.acceptedPriceCents) 
      : (cached.acceptedPriceCents || undefined),
    offerMadeCents: project.purchaseTerms?.offerMadeCents 
      ? Number(project.purchaseTerms.offerMadeCents) 
      : (cached.offerMadeCents || undefined),
    earnestMoneyCents: project.purchaseTerms?.earnestMoneyCents 
      ? Number(project.purchaseTerms.earnestMoneyCents) 
      : (cached.earnestMoneyCents || undefined),
    estClosingCostsCents: project.purchaseTerms?.estClosingCostsCents 
      ? Number(project.purchaseTerms.estClosingCostsCents) 
      : (cached.estClosingCostsCents || undefined),
    amountPaidCents: project.purchaseTerms?.amountPaidCents 
      ? Number(project.purchaseTerms.amountPaidCents) 
      : (cached.amountPaidCents || undefined),
    offerStatus: project.purchaseTerms?.sellerResponse === 'ACCEPTED' ? 'Accepted' : (cached.offerStatus || 'Draft'),
    askingPriceCents: project.askingPriceCents ? Number(project.askingPriceCents) : (cached.askingPriceCents || undefined),
    medianSalesPriceCents: project.medianSalesPriceCents ? Number(project.medianSalesPriceCents) : (cached.medianSalesPriceCents || undefined),
    medianRentCents: project.medianRentCents ? Number(project.medianRentCents) : (cached.medianRentCents || undefined),
    firstPassRentCents: project.firstPassRentCents ? Number(project.firstPassRentCents) : (cached.firstPassRentCents || undefined),
    arvCents: project.arvCents ? Number(project.arvCents) : (cached.arvCents || undefined),
    
    // Legacy mapping to satisfy compute wrappers
    monthlyGrossRent: cached.gross_rent_per_unit ?? cached.monthlyGrossRent ?? 0,
    vacancyRatePercent: cached.vacancy_pct ?? cached.vacancyRatePercent ?? 0,
    taxes: cached.tax ?? cached.taxes ?? 0,
  };

  const serialized = JSON.parse(
    JSON.stringify(project, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );

  return {
    ...serialized,
    propertyName: project.displayName || project.addressLine || 'Unnamed Project',
    address: project.addressLine 
      ? `${project.addressLine}, ${project.city}, ${project.state} ${project.zip}`.trim().replace(/,\s*$/, '') 
      : 'No Address',
    status: project.acquisitionStatus === 'PROSPECT' ? 'Lead' : 
            project.acquisitionStatus === 'UNDER_CONTRACT' ? 'Under Contract' : 
            project.acquisitionStatus === 'REHAB' ? 'Renovating' : 
            project.acquisitionStatus === 'RENTED' ? 'Rented' : 
            project.acquisitionStatus === 'SOLD' ? 'Sold' : 
            project.acquisitionStatus === 'DEAD' ? 'closed_lost' : 
            project.acquisitionStatus === 'CLOSED' ? 'closed_won' : 'Active',
    ownerUid: project.createdById,
    members: {
      [project.createdById]: {
        role: 'Lead Investor',
        addedAt: project.createdAt,
      }
    },
    financials,
  };
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

function toBigInt(v: any): bigint | null {
  if (v === undefined || v === null) return null;
  return BigInt(v);
}

function toDate(v: any): Date | null {
  if (v === undefined || v === null) return null;
  return new Date(v);
}
