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
  status?:            string;
  dispositionType?:   string | null;
  disposition_type?:  string | null;
  subStrategy?:       string | null;
  holdHorizon?:       number | null;
  exitAssumption?:    string | null;
  entryStage?:        string | null;
  project_entry_point?: string | null;
  lastActiveStage?:   string | null;
  overrideReason?:    string | null;
  propertyType?:      string | null;
  property_type?:     string | null;
  units?:             number | null;
  unit_count?:        number | null;
  condition?:         string | null;
  retrospective?:     boolean;
  apn?:               string | null;
  sqft?:              number | null;
  lotSqft?:           number | null;
  yearBuilt?:         number | null;
  beds?:              number | null;
  baths?:             number | null;
  vacancy_rate?:      number | null;
  expense_tax?:       number | null;
  expense_insurance?: number | null;
  expense_security?:  number | null;
  expense_maintenance?: number | null;
  expense_utilities?: number | null;
  expense_management?: number | null;
  expense_hoa?:        number | null;
  expense_capex?:      number | null;
  has_professional_management?: string | null;
  expected_purchase_price?: number | null;
  down_payment_pct?:   number | null;
  est_rate?:           number | null;
  est_term_years?:     number | null;
  closing_costs?:      number | null;
  upfront_rehab_budget?: number | null;
  hold_period_years?:  number | null;
  appreciation_rate?:  number | null;

  // AQ-5 fields
  leadSource?:        string | null;
  listingUrl?:        string | null;
  askingPriceCents?:  bigint | number | null;
  list_price?:        bigint | number | null;
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
  gross_annual_rent?:  bigint | number | null;
  firstPassVerdict?:   string | null;

  // AQ-7 fields
  arvCents?:           bigint | number | null;
  comps?:              any[];

  offer_price?:        number | null;
  earnest_money?:      number | null;
  offer_terms?:        string | null;
  offer_status?:       string | null;
  accepted_price?:     number | null;
  contract_executed_date?: string | null;
  financials?:         any;
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
      status:             input.status ?? (input.currentPhase === 2 ? "fund" : input.currentPhase === 3 ? "hold" : input.currentPhase === 4 ? "exit" : "acquisition"),
      dispositionType:    input.dispositionType    ?? input.disposition_type ?? null,
      subStrategy:        input.subStrategy        ?? null,
      holdHorizon:        input.holdHorizon        ?? null,
      exitAssumption:     input.exitAssumption     ?? null,
      entryStage:         input.entryStage         ?? input.project_entry_point ?? null,
      lastActiveStage:    input.lastActiveStage    ?? null,
      overrideReason:     input.overrideReason     ?? null,
      propertyType:       input.propertyType       ?? input.property_type ?? null,
      units:              input.units              ?? input.unit_count ?? null,
      condition:          input.condition          ?? null,
      retrospective:      input.retrospective      ?? false,

      // AQ-5 mapping
      leadSource:         input.leadSource         ?? null,
      listingUrl:         input.listingUrl         ?? null,
      askingPriceCents:   toBigInt(input.askingPriceCents ?? input.list_price),
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
      firstPassRentCents: toBigInt(input.firstPassRentCents ?? (input.gross_annual_rent ? Math.round(Number(input.gross_annual_rent) / 12) : undefined)),
      firstPassVerdict:   input.firstPassVerdict   ?? null,

      // AQ-7 mapping
      arvCents:           toBigInt(input.arvCents),
      // Target Details nested creation (AQ-4)
      ...((input.apn !== undefined || input.sqft !== undefined || input.lotSqft !== undefined || input.yearBuilt !== undefined || input.propertyType !== undefined || input.beds !== undefined || input.baths !== undefined) && {
        propertyFacts: {
          create: {
            apn: input.apn ?? null,
            sqft: input.sqft ?? null,
            lotSqft: input.lotSqft ?? null,
            yearBuilt: input.yearBuilt ?? null,
            propertyType: input.propertyType ?? null,
            beds: input.beds ?? null,
            baths: input.baths ?? null,
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
  
  if (data.vacancy_rate !== undefined && data.vacancy_rate !== null) {
    current.vacancy_rate = Number(data.vacancy_rate);
    current.vacancy_pct = Number(data.vacancy_rate);
    current.vacancyRatePercent = Number(data.vacancy_rate);
  }
  if (current.vacancy_rate !== undefined && current.vacancy_rate !== null) {
    current.vacancy_pct = Number(current.vacancy_rate);
    current.vacancyRatePercent = Number(current.vacancy_rate);
  }

  // Sync expense_<category> to legacy fields
  const syncExpense = (field: string, targetFields: string[]) => {
    let val: any = undefined;
    if (data[field] !== undefined) val = data[field];
    else if (data.financials?.[field] !== undefined) val = data.financials[field];
    
    if (val !== undefined && val !== null) {
      current[field] = Number(val);
      for (const tf of targetFields) {
        current[tf] = Number(val);
      }
    }
    
    if (current[field] !== undefined && current[field] !== null) {
      for (const tf of targetFields) {
        current[tf] = Number(current[field]);
      }
    }
  };

  syncExpense('expense_tax', ['tax', 'holdingCostTaxes', 'operatingExpenseTaxes']);
  syncExpense('expense_insurance', ['insurance', 'holdingCostInsurance', 'operatingExpenseInsurance']);
  syncExpense('expense_security', ['security']);
  syncExpense('expense_maintenance', ['maintenance', 'monthlyMaintenanceReserve', 'maintenanceReserves']);
  syncExpense('expense_utilities', ['utilities', 'holdingCostUtilities']);
  syncExpense('expense_management', ['management', 'propertyManagementFee']);
  syncExpense('expense_hoa', ['HOA', 'monthlyHOA']);
  syncExpense('expense_capex', ['capex']);
  
  if (data.has_professional_management !== undefined) {
    current.has_professional_management = data.has_professional_management;
  }
  if (data.financials?.has_professional_management !== undefined) {
    current.has_professional_management = data.financials.has_professional_management;
  }

  syncExpense('expected_purchase_price', ['purchasePrice', 'targetPrice']);
  syncExpense('down_payment_pct', ['downPaymentPercent']);
  syncExpense('est_rate', ['loanInterestRate']);
  syncExpense('est_term_years', ['loanTermYears']);

  let ccVal: any = undefined;
  if (data.closing_costs !== undefined) ccVal = data.closing_costs;
  else if (data.financials?.closing_costs !== undefined) ccVal = data.financials.closing_costs;
  if (ccVal !== undefined && ccVal !== null) {
    current.closing_costs = Number(ccVal);
    current.closingCosts = Number(ccVal);
    current.estClosingCostsCents = Number(ccVal) * 100;
  }

  syncExpense('upfront_rehab_budget', ['projectedRehabCost']);

  let hpVal: any = undefined;
  if (data.hold_period_years !== undefined) hpVal = data.hold_period_years;
  else if (data.financials?.hold_period_years !== undefined) hpVal = data.financials.hold_period_years;
  if (hpVal !== undefined && hpVal !== null) {
    current.hold_period_years = Number(hpVal);
    current.projectedHoldTimeMonths = Number(hpVal) * 12;
  }

  syncExpense('appreciation_rate', ['annualAppreciationPercent']);

  let opVal: any = undefined;
  if (data.offer_price !== undefined) opVal = data.offer_price;
  else if (data.financials?.offer_price !== undefined) opVal = data.financials.offer_price;
  if (opVal !== undefined && opVal !== null) {
    current.offer_price = Number(opVal);
    current.offerMadeCents = Number(opVal);
  }

  let emVal: any = undefined;
  if (data.earnest_money !== undefined) emVal = data.earnest_money;
  else if (data.financials?.earnest_money !== undefined) emVal = data.financials.earnest_money;
  if (emVal !== undefined && emVal !== null) {
    current.earnest_money = Number(emVal);
    current.earnestMoneyCents = Number(emVal);
  }

  let otVal: any = undefined;
  if (data.offer_terms !== undefined) otVal = data.offer_terms;
  else if (data.financials?.offer_terms !== undefined) otVal = data.financials.offer_terms;
  if (otVal !== undefined && otVal !== null) {
    current.offer_terms = String(otVal);
  }

  let osVal: any = undefined;
  if (data.offer_status !== undefined) osVal = data.offer_status;
  else if (data.financials?.offer_status !== undefined) osVal = data.financials.offer_status;
  if (osVal !== undefined && osVal !== null) {
    current.offer_status = String(osVal);
    if (osVal === 'accepted') current.offerStatus = 'Accepted';
    else if (osVal === 'rejected') current.offerStatus = 'Rejected';
    else if (osVal === 'countered') current.offerStatus = 'Countered';
    else if (osVal === 'submitted') current.offerStatus = 'Offer Sent';
  }

  let apVal: any = undefined;
  if (data.accepted_price !== undefined) apVal = data.accepted_price;
  else if (data.financials?.accepted_price !== undefined) apVal = data.financials.accepted_price;
  if (apVal !== undefined && apVal !== null) {
    current.accepted_price = Number(apVal);
    current.acceptedPriceCents = Number(apVal);
    current.finalAgreedPrice = Number(apVal);
    if (current.offer_status === 'accepted' || current.offerStatus === 'Accepted') {
      current.expected_purchase_price = Number(apVal);
      current.purchasePrice = Number(apVal);
      current.targetPrice = Number(apVal);
    }
  }

  let cedVal: any = undefined;
  if (data.contract_executed_date !== undefined) cedVal = data.contract_executed_date;
  else if (data.financials?.contract_executed_date !== undefined) cedVal = data.financials.contract_executed_date;
  if (cedVal !== undefined && cedVal !== null) {
    current.contract_executed_date = String(cedVal);
  }
  
  let istVal: any = undefined;
  if (data.inspection_status !== undefined) istVal = data.inspection_status;
  else if (data.financials?.inspection_status !== undefined) istVal = data.financials.inspection_status;
  if (istVal !== undefined && istVal !== null) {
    current.inspection_status = String(istVal);
  }

  let ifnVal: any = undefined;
  if (data.inspection_findings !== undefined) ifnVal = data.inspection_findings;
  else if (data.financials?.inspection_findings !== undefined) ifnVal = data.financials.inspection_findings;
  if (ifnVal !== undefined && ifnVal !== null) {
    current.inspection_findings = String(ifnVal);
  }

  // Radon Test
  let rtsVal: any = undefined;
  if (data.radon_test_status !== undefined) rtsVal = data.radon_test_status;
  else if (data.financials?.radon_test_status !== undefined) rtsVal = data.financials.radon_test_status;
  if (rtsVal !== undefined && rtsVal !== null) {
    current.radon_test_status = String(rtsVal);
  }

  let rtrVal: any = undefined;
  if (data.radon_test_result !== undefined) rtrVal = data.radon_test_result;
  else if (data.financials?.radon_test_result !== undefined) rtrVal = data.financials.radon_test_result;
  if (rtrVal !== undefined && rtrVal !== null) {
    current.radon_test_result = String(rtrVal);
  }

  // Lead Test
  let ltsVal: any = undefined;
  if (data.lead_test_status !== undefined) ltsVal = data.lead_test_status;
  else if (data.financials?.lead_test_status !== undefined) ltsVal = data.financials.lead_test_status;
  if (ltsVal !== undefined && ltsVal !== null) {
    current.lead_test_status = String(ltsVal);
  }

  let ltrVal: any = undefined;
  if (data.lead_test_result !== undefined) ltrVal = data.lead_test_result;
  else if (data.financials?.lead_test_result !== undefined) ltrVal = data.financials.lead_test_result;
  if (ltrVal !== undefined && ltrVal !== null) {
    current.lead_test_result = String(ltrVal);
  }

  // Termite Test
  let ttsVal: any = undefined;
  if (data.termite_test_status !== undefined) ttsVal = data.termite_test_status;
  else if (data.financials?.termite_test_status !== undefined) ttsVal = data.financials.termite_test_status;
  if (ttsVal !== undefined && ttsVal !== null) {
    current.termite_test_status = String(ttsVal);
  }

  let ttrVal: any = undefined;
  if (data.termite_test_result !== undefined) ttrVal = data.termite_test_result;
  else if (data.financials?.termite_test_result !== undefined) ttrVal = data.financials.termite_test_result;
  if (ttrVal !== undefined && ttrVal !== null) {
    current.termite_test_result = String(ttrVal);
  }

  // Flag & Election Toggles
  let ifstVal: any = undefined;
  if (data.inspector_flagged_specialty_tests !== undefined) ifstVal = data.inspector_flagged_specialty_tests;
  else if (data.financials?.inspector_flagged_specialty_tests !== undefined) ifstVal = data.financials.inspector_flagged_specialty_tests;
  if (ifstVal !== undefined && ifstVal !== null) {
    current.inspector_flagged_specialty_tests = Boolean(ifstVal);
  }

  let acteVal: any = undefined;
  if (data.age_conditional_tests_elected !== undefined) acteVal = data.age_conditional_tests_elected;
  else if (data.financials?.age_conditional_tests_elected !== undefined) acteVal = data.age_conditional_tests_elected;
  if (acteVal !== undefined && acteVal !== null) {
    current.age_conditional_tests_elected = Boolean(acteVal);
  }

  // Phase I ESA Syncing
  let phaseIESAStatus: any = undefined;
  if (data.phase_i_esa_status !== undefined) phaseIESAStatus = data.phase_i_esa_status;
  else if (data.financials?.phase_i_esa_status !== undefined) phaseIESAStatus = data.financials.phase_i_esa_status;
  if (phaseIESAStatus !== undefined && phaseIESAStatus !== null) {
    current.phase_i_esa_status = String(phaseIESAStatus);
    if (phaseIESAStatus === 'waived') {
      current.phaseIWaived = true;
    } else {
      current.phaseIWaived = false;
    }
  }

  let phaseIESAFindings: any = undefined;
  if (data.phase_i_esa_findings !== undefined) phaseIESAFindings = data.phase_i_esa_findings;
  else if (data.financials?.phase_i_esa_findings !== undefined) phaseIESAFindings = data.financials.phase_i_esa_findings;
  if (phaseIESAFindings !== undefined && phaseIESAFindings !== null) {
    current.phase_i_esa_findings = String(phaseIESAFindings);
    current.phaseIFindings = String(phaseIESAFindings);
  }

  let phaseIWaivedVal: any = undefined;
  if (data.phaseIWaived !== undefined) phaseIWaivedVal = data.phaseIWaived;
  else if (data.financials?.phaseIWaived !== undefined) phaseIWaivedVal = data.financials.phaseIWaived;
  if (phaseIWaivedVal !== undefined && phaseIWaivedVal !== null) {
    current.phaseIWaived = Boolean(phaseIWaivedVal);
    if (phaseIWaivedVal) {
      current.phase_i_esa_status = 'waived';
    } else if (current.phase_i_esa_status === 'waived') {
      current.phase_i_esa_status = 'pending';
    }
  }

  let phaseIFindingsVal: any = undefined;
  if (data.phaseIFindings !== undefined) phaseIFindingsVal = data.phaseIFindings;
  else if (data.financials?.phaseIFindings !== undefined) phaseIFindingsVal = data.financials.phaseIFindings;
  if (phaseIFindingsVal !== undefined && phaseIFindingsVal !== null) {
    current.phaseIFindings = String(phaseIFindingsVal);
    current.phase_i_esa_findings = String(phaseIFindingsVal);
  }

  // HOA branch sync
  let hasHoaVal: any = undefined;
  if (data.has_hoa !== undefined) hasHoaVal = data.has_hoa;
  else if (data.financials?.has_hoa !== undefined) hasHoaVal = data.financials.has_hoa;
  if (hasHoaVal !== undefined && hasHoaVal !== null) {
    current.has_hoa = Boolean(hasHoaVal);
    current.hasHOA = Boolean(hasHoaVal);
    current.hoa = Boolean(hasHoaVal);
  }

  let hoaDuesVal: any = undefined;
  if (data.hoa_dues !== undefined) hoaDuesVal = data.hoa_dues;
  else if (data.financials?.hoa_dues !== undefined) hoaDuesVal = data.financials.hoa_dues;
  if (hoaDuesVal !== undefined && hoaDuesVal !== null) {
    current.hoa_dues = Number(hoaDuesVal);
    // Sync actual dues (cents) to underwriting expense fields (dollars)
    const dollars = Number(hoaDuesVal) / 100;
    current.expense_hoa = dollars;
    current.HOA = dollars;
    current.monthlyHOA = dollars;
  }

  // Title opening sync
  let titleCompanyVal: any = undefined;
  if (data.title_company !== undefined) titleCompanyVal = data.title_company;
  else if (data.financials?.title_company !== undefined) titleCompanyVal = data.financials.title_company;
  else if (data.titleCompany !== undefined) titleCompanyVal = data.titleCompany;
  else if (data.financials?.titleCompany !== undefined) titleCompanyVal = data.financials.titleCompany;
  if (titleCompanyVal !== undefined && titleCompanyVal !== null) {
    current.title_company = String(titleCompanyVal);
    current.titleCompany = String(titleCompanyVal);
  }
  
  // Contingency deadline tracker sync
  let contsVal: any = undefined;
  if (data.contingencies !== undefined) contsVal = data.contingencies;
  else if (data.financials?.contingencies !== undefined) contsVal = data.financials.contingencies;
  if (contsVal !== undefined && contsVal !== null) {
    current.contingencies = contsVal;
  }
  
  
  // Go/No-go Decision sync & legacy compatibility
  let ddDecisionVal: any = undefined;
  if (data.dd_decision !== undefined) ddDecisionVal = data.dd_decision;
  else if (data.financials?.dd_decision !== undefined) ddDecisionVal = data.financials.dd_decision;
  if (ddDecisionVal !== undefined && ddDecisionVal !== null) {
    current.dd_decision = String(ddDecisionVal);
    if (ddDecisionVal === 'proceed') {
      current.decision = 'proceed';
      current.dealStatus = 'Proceeding';
    } else if (ddDecisionVal === 'renegotiate') {
      current.decision = 'renegotiate';
    } else if (ddDecisionVal === 'walk') {
      current.decision = 'terminate';
      current.dealStatus = 'Terminated';
    }
  }

  let decisionVal: any = undefined;
  if (data.decision !== undefined) decisionVal = data.decision;
  else if (data.financials?.decision !== undefined) decisionVal = data.financials.decision;
  if (decisionVal !== undefined && decisionVal !== null) {
    current.decision = String(decisionVal);
    if (decisionVal === 'proceed') {
      current.dd_decision = 'proceed';
      current.dealStatus = 'Proceeding';
    } else if (decisionVal === 'renegotiate') {
      current.dd_decision = 'renegotiate';
    } else if (decisionVal === 'terminate') {
      current.dd_decision = 'walk';
      current.dealStatus = 'Terminated';
    }
  }

  let ddDecisionReasonVal: any = undefined;
  if (data.dd_decision_reason !== undefined) ddDecisionReasonVal = data.dd_decision_reason;
  else if (data.financials?.dd_decision_reason !== undefined) ddDecisionReasonVal = data.financials.dd_decision_reason;
  if (ddDecisionReasonVal !== undefined && ddDecisionReasonVal !== null) {
    current.dd_decision_reason = String(ddDecisionReasonVal);
  }

  
  // Capital Intention sync & bidirectional mapping
  let capitalIntentVal: any = undefined;
  if (data.capital_intent !== undefined) capitalIntentVal = data.capital_intent;
  else if (data.financials?.capital_intent !== undefined) capitalIntentVal = data.financials.capital_intent;
  if (capitalIntentVal !== undefined && capitalIntentVal !== null) {
    current.capital_intent = String(capitalIntentVal);
    if (capitalIntentVal === 'solo') {
      if (current.capitalPlan !== 'solo-financed') {
        current.capitalPlan = 'all-cash solo';
      }
    } else if (capitalIntentVal === 'group') {
      current.capitalPlan = 'partnership';
    } else if (capitalIntentVal === 'raise') {
      current.capitalPlan = 'raise interest';
    }
  }

  let capitalPlanVal: any = undefined;
  if (data.capitalPlan !== undefined) capitalPlanVal = data.capitalPlan;
  else if (data.financials?.capitalPlan !== undefined) capitalPlanVal = data.financials.capitalPlan;
  if (capitalPlanVal !== undefined && capitalPlanVal !== null) {
    current.capitalPlan = String(capitalPlanVal);
    if (capitalPlanVal === 'all-cash solo' || capitalPlanVal === 'solo-financed') {
      current.capital_intent = 'solo';
    } else if (capitalPlanVal === 'partnership') {
      current.capital_intent = 'group';
    } else if (capitalPlanVal === 'raise interest') {
      current.capital_intent = 'raise';
    }
  }

  let onePagerReviewedVal: any = undefined;
  if (data.one_pager_reviewed !== undefined) onePagerReviewedVal = data.one_pager_reviewed;
  else if (data.financials?.one_pager_reviewed !== undefined) onePagerReviewedVal = data.financials.one_pager_reviewed;
  if (onePagerReviewedVal !== undefined && onePagerReviewedVal !== null) {
    current.one_pager_reviewed = Boolean(onePagerReviewedVal);
  }

  let loiLogVal: any = undefined;
  if (data.loi_log !== undefined) loiLogVal = data.loi_log;
  else if (data.financials?.loi_log !== undefined) loiLogVal = data.financials.loi_log;
  if (loiLogVal !== undefined && loiLogVal !== null) {
    current.loi_log = loiLogVal;
  }

  let equityTargetVal: any = undefined;
  if (data.equity_target !== undefined) equityTargetVal = data.equity_target;
  else if (data.financials?.equity_target !== undefined) equityTargetVal = data.financials.equity_target;
  if (equityTargetVal !== undefined && equityTargetVal !== null) {
    current.equity_target = Number(equityTargetVal);
  }

  // Phase 2 sync:
  const phase2Fields = ['fundingPlan', 'funding_modality', 'capitalSources', 'capital_source', 'equityParties', 'equity_party', 'loans', 'contributions', 'titleHolding', 'title_holding', 'distribution_structure', 'milestoneTimeline', 'closingRecord'];
  for (const f of phase2Fields) {
    let fVal = data[f] !== undefined ? data[f] : data.financials?.[f];
    if (fVal !== undefined && fVal !== null) {
      current[f] = fVal;
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
      ...(data.status             !== undefined && { status:             data.status             }),
      ...((data as any).currentPhase !== undefined && {
        status: (data as any).currentPhase === 2 ? 'fund' : (data as any).currentPhase === 3 ? 'hold' : (data as any).currentPhase === 4 ? 'exit' : 'acquisition'
      }),
      ...((data.dispositionType !== undefined || data.disposition_type !== undefined) && { dispositionType: data.dispositionType ?? data.disposition_type }),
      ...(data.subStrategy        !== undefined && { subStrategy:        data.subStrategy        }),
      ...(data.holdHorizon        !== undefined && { holdHorizon:        data.holdHorizon        }),
      ...(data.exitAssumption     !== undefined && { exitAssumption:     data.exitAssumption     }),
      ...((data.entryStage !== undefined || data.project_entry_point !== undefined) && { entryStage: data.entryStage ?? data.project_entry_point }),
      ...(data.lastActiveStage    !== undefined && { lastActiveStage:    data.lastActiveStage    }),
      ...(data.overrideReason     !== undefined && { overrideReason:     data.overrideReason     }),
      ...((data.propertyType !== undefined || data.property_type !== undefined) && { propertyType: data.propertyType ?? data.property_type }),
      ...((data.units !== undefined || data.unit_count !== undefined) && { units: data.units ?? data.unit_count }),
      ...(data.condition          !== undefined && { condition:          data.condition          }),
      ...(data.retrospective      !== undefined && { retrospective:      data.retrospective      }),
      // Sync to purchaseTerms if any relevant fields are passed
      ...((data.offer_price !== undefined || data.earnest_money !== undefined || data.offer_status !== undefined || data.accepted_price !== undefined ||
           data.financials?.offer_price !== undefined || data.financials?.earnest_money !== undefined || data.financials?.offer_status !== undefined || data.financials?.accepted_price !== undefined) && {
        purchaseTerms: {
          upsert: {
            create: {
              offerMadeCents: toBigInt(data.offer_price ?? data.financials?.offer_price),
              earnestMoneyCents: toBigInt(data.earnest_money ?? data.financials?.earnest_money),
              acceptedPriceCents: toBigInt(data.accepted_price ?? data.financials?.accepted_price),
              sellerResponse: mapStatusToSellerResponse(data.offer_status ?? data.financials?.offer_status) ?? 'PENDING',
            },
            update: {
              ...(data.offer_price !== undefined && { offerMadeCents: toBigInt(data.offer_price) }),
              ...(data.financials?.offer_price !== undefined && { offerMadeCents: toBigInt(data.financials.offer_price) }),
              ...(data.earnest_money !== undefined && { earnestMoneyCents: toBigInt(data.earnest_money) }),
              ...(data.financials?.earnest_money !== undefined && { earnestMoneyCents: toBigInt(data.financials.earnest_money) }),
              ...(data.accepted_price !== undefined && { acceptedPriceCents: toBigInt(data.accepted_price) }),
              ...(data.financials?.accepted_price !== undefined && { acceptedPriceCents: toBigInt(data.financials.accepted_price) }),
              ...((data.offer_status !== undefined || data.financials?.offer_status !== undefined) && {
                sellerResponse: mapStatusToSellerResponse(data.offer_status ?? data.financials?.offer_status)
              }),
            }
          }
        }
      }),
      // Target Details nested update / upsert (AQ-4)
      ...((data.apn !== undefined || data.sqft !== undefined || data.lotSqft !== undefined || data.yearBuilt !== undefined || data.propertyType !== undefined || data.beds !== undefined || data.baths !== undefined) && {
        propertyFacts: {
          upsert: {
            create: {
              apn: data.apn ?? null,
              sqft: data.sqft ?? null,
              lotSqft: data.lotSqft ?? null,
              yearBuilt: data.yearBuilt ?? null,
              propertyType: data.propertyType ?? null,
              beds: data.beds ?? null,
              baths: data.baths ?? null,
              sourceProvider: 'user',
              fetchedAt: new Date(),
            },
            update: {
              ...(data.apn !== undefined && { apn: data.apn }),
              ...(data.sqft !== undefined && { sqft: data.sqft }),
              ...(data.lotSqft !== undefined && { lotSqft: data.lotSqft }),
              ...(data.yearBuilt !== undefined && { yearBuilt: data.yearBuilt }),
              ...(data.propertyType !== undefined && { propertyType: data.propertyType }),
              ...(data.beds !== undefined && { beds: data.beds }),
              ...(data.baths !== undefined && { baths: data.baths }),
            }
          }
        }
      }),

      // AQ-5 mapping
      ...(data.leadSource         !== undefined && { leadSource:         data.leadSource         }),
      ...(data.listingUrl         !== undefined && { listingUrl:         data.listingUrl         }),
      ...((data.askingPriceCents !== undefined || data.list_price !== undefined) && { askingPriceCents: toBigInt(data.askingPriceCents ?? data.list_price) }),
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
      ...((data.firstPassRentCents !== undefined || data.gross_annual_rent !== undefined) && { firstPassRentCents: toBigInt(data.firstPassRentCents ?? (data.gross_annual_rent ? Math.round(Number(data.gross_annual_rent) / 12) : undefined)) }),
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
      ? Number(project.purchaseTerms.offerMadeCents) 
      : (cached.offer_price || undefined),
    earnest_money: project.purchaseTerms?.earnestMoneyCents 
      ? Number(project.purchaseTerms.earnestMoneyCents) 
      : (cached.earnest_money || undefined),
    offer_terms: cached.offer_terms || undefined,
    offer_status: project.purchaseTerms?.sellerResponse === 'ACCEPTED' ? 'accepted' 
      : (project.purchaseTerms?.sellerResponse === 'COUNTERED' ? 'countered'
      : (project.purchaseTerms?.sellerResponse === 'REJECTED' ? 'rejected'
      : (project.purchaseTerms?.sellerResponse === 'PENDING' ? 'submitted' : (cached.offer_status || undefined)))),
    accepted_price: project.purchaseTerms?.acceptedPriceCents 
      ? Number(project.purchaseTerms.acceptedPriceCents) 
      : (cached.accepted_price || undefined),
    contract_executed_date: cached.contract_executed_date || undefined,
    inspection_status: cached.inspection_status || undefined,
    inspection_findings: cached.inspection_findings || undefined,
    radon_test_status: cached.radon_test_status || undefined,
    radon_test_result: cached.radon_test_result || undefined,
    lead_test_status: cached.lead_test_status || undefined,
    lead_test_result: cached.lead_test_result || undefined,
    termite_test_status: cached.termite_test_status || undefined,
    termite_test_result: cached.termite_test_result || undefined,
    inspector_flagged_specialty_tests: cached.inspector_flagged_specialty_tests !== undefined ? Boolean(cached.inspector_flagged_specialty_tests) : undefined,
    age_conditional_tests_elected: cached.age_conditional_tests_elected !== undefined ? Boolean(cached.age_conditional_tests_elected) : undefined,
    phase_i_esa_status: cached.phase_i_esa_status || undefined,
    phase_i_esa_findings: cached.phase_i_esa_findings || undefined,
    has_hoa: cached.has_hoa !== undefined ? Boolean(cached.has_hoa) : undefined,
    hoa_dues: cached.hoa_dues !== undefined ? Number(cached.hoa_dues) : undefined,
    title_company: cached.title_company || undefined,
    titleCompany: cached.titleCompany || undefined,
    radonDocumentUrl: cached.radonDocumentUrl || undefined,
    radonDocumentName: cached.radonDocumentName || undefined,
    leadDocumentUrl: cached.leadDocumentUrl || undefined,
    leadDocumentName: cached.leadDocumentName || undefined,
    termiteDocumentUrl: cached.termiteDocumentUrl || undefined,
    termiteDocumentName: cached.termiteDocumentName || undefined,
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
    offerStatus: project.purchaseTerms?.sellerResponse === 'ACCEPTED' ? 'Accepted' 
      : (project.purchaseTerms?.sellerResponse === 'COUNTERED' ? 'Countered'
      : (project.purchaseTerms?.sellerResponse === 'REJECTED' ? 'Rejected'
      : (project.purchaseTerms?.sellerResponse === 'PENDING' ? 'Offer Sent' : (cached.offerStatus || 'Draft')))),
    askingPriceCents: project.askingPriceCents ? Number(project.askingPriceCents) : (cached.askingPriceCents || undefined),
    medianSalesPriceCents: project.medianSalesPriceCents ? Number(project.medianSalesPriceCents) : (cached.medianSalesPriceCents || undefined),
    medianRentCents: project.medianRentCents ? Number(project.medianRentCents) : (cached.medianRentCents || undefined),
    firstPassRentCents: project.firstPassRentCents ? Number(project.firstPassRentCents) : (cached.firstPassRentCents || undefined),
    arvCents: project.arvCents ? Number(project.arvCents) : (cached.arvCents || undefined),
    
    // Legacy mapping to satisfy compute wrappers
    monthlyGrossRent: project.firstPassRentCents ? Number(project.firstPassRentCents) / 100 : (cached.gross_rent_per_unit ?? cached.monthlyGrossRent ?? 0),
    vacancyRatePercent: cached.vacancy_pct ?? cached.vacancyRatePercent ?? 0,
    taxes: cached.tax ?? cached.taxes ?? 0,
  };

  const serialized = JSON.parse(
    JSON.stringify(project, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );

  const statusStr = project.status || 'acquisition';
  const derivedPhase = statusStr === 'acquisition' ? 1 : statusStr === 'fund' ? 2 : statusStr === 'hold' ? 3 : 4;
  const derivedPhaseStatus = statusStr === 'acquisition' ? 'Phase 1: Acquisition' : statusStr === 'fund' ? 'Phase 2: Fund' : statusStr === 'hold' ? 'Phase 3: Hold' : 'Phase 4: Exit';

  return {
    ...serialized,
    project_entry_point: project.entryStage,
    property_type: project.propertyType,
    unit_count: project.units,
    disposition_type: project.dispositionType,
    list_price: project.askingPriceCents ? Number(project.askingPriceCents) : undefined,
    gross_annual_rent: project.firstPassRentCents ? Number(project.firstPassRentCents) * 12 : (cached.gross_annual_rent ?? (cached.monthlyGrossRent ? Number(cached.monthlyGrossRent) * 12 * 100 : undefined)),
    squareFootage: project.propertyFacts?.sqft ? Number(project.propertyFacts.sqft) : (cached.squareFootage ?? cached.sqft ?? undefined),
    yearBuilt: project.propertyFacts?.yearBuilt ? Number(project.propertyFacts.yearBuilt) : (cached.yearBuilt ?? undefined),
    beds: project.propertyFacts?.beds ? Number(project.propertyFacts.beds) : (cached.beds ?? undefined),
    baths: project.propertyFacts?.baths ? Number(project.propertyFacts.baths) : (cached.baths ?? undefined),
    vacancy_rate: cached.vacancy_pct ?? cached.vacancyRatePercent ?? cached.vacancy_rate ?? undefined,
    expense_tax: cached.expense_tax !== undefined ? Number(cached.expense_tax) * 100 : (cached.tax ?? cached.holdingCostTaxes ? Number(cached.tax ?? cached.holdingCostTaxes) * 100 : undefined),
    expense_insurance: cached.expense_insurance !== undefined ? Number(cached.expense_insurance) * 100 : (cached.insurance ?? cached.holdingCostInsurance ? Number(cached.insurance ?? cached.holdingCostInsurance) * 100 : undefined),
    expense_security: cached.expense_security !== undefined ? Number(cached.expense_security) * 100 : (cached.security ? Number(cached.security) * 100 : undefined),
    expense_maintenance: cached.expense_maintenance !== undefined ? Number(cached.expense_maintenance) * 100 : (cached.maintenance ?? cached.monthlyMaintenanceReserve ?? cached.maintenanceReserves ? Number(cached.maintenance ?? cached.monthlyMaintenanceReserve ?? cached.maintenanceReserves) * 100 : undefined),
    expense_utilities: cached.expense_utilities !== undefined ? Number(cached.expense_utilities) * 100 : (cached.utilities ?? cached.holdingCostUtilities ? Number(cached.utilities ?? cached.holdingCostUtilities) * 100 : undefined),
    expense_management: cached.expense_management !== undefined ? Number(cached.expense_management) * 100 : (cached.management ?? cached.propertyManagementFee ? Number(cached.management ?? cached.propertyManagementFee) * 100 : undefined),
    expense_hoa: cached.expense_hoa !== undefined ? Number(cached.expense_hoa) * 100 : (cached.HOA ?? cached.monthlyHOA ? Number(cached.HOA ?? cached.monthlyHOA) * 100 : undefined),
    expense_capex: cached.expense_capex !== undefined ? Number(cached.expense_capex) * 100 : (cached.capex ? Number(cached.capex) * 100 : undefined),
    has_professional_management: cached.has_professional_management ?? undefined,
    expected_purchase_price: cached.expected_purchase_price !== undefined ? Number(cached.expected_purchase_price) * 100 : (cached.purchasePrice ?? cached.targetPrice ? Number(cached.purchasePrice ?? cached.targetPrice) * 100 : undefined),
    down_payment_pct: cached.down_payment_pct !== undefined ? Number(cached.down_payment_pct) : (cached.downPaymentPercent !== undefined ? Number(cached.downPaymentPercent) : undefined),
    est_rate: cached.est_rate !== undefined ? Number(cached.est_rate) : (cached.loanInterestRate !== undefined ? Number(cached.loanInterestRate) : undefined),
    est_term_years: cached.est_term_years !== undefined ? Number(cached.est_term_years) : (cached.loanTermYears !== undefined ? Number(cached.loanTermYears) : undefined),
    closing_costs: cached.closing_costs !== undefined ? Number(cached.closing_costs) * 100 : (cached.estClosingCostsCents ? Number(cached.estClosingCostsCents) : (cached.closingCosts ? Number(cached.closingCosts) * 100 : undefined)),
    upfront_rehab_budget: cached.upfront_rehab_budget !== undefined ? Number(cached.upfront_rehab_budget) * 100 : (cached.projectedRehabCost ? Number(cached.projectedRehabCost) * 100 : undefined),
    hold_period_years: cached.hold_period_years !== undefined ? Number(cached.hold_period_years) : (cached.projectedHoldTimeMonths ? Number(cached.projectedHoldTimeMonths) / 12 : undefined),
    appreciation_rate: cached.appreciation_rate !== undefined ? Number(cached.appreciation_rate) : (cached.annualAppreciationPercent !== undefined ? Number(cached.annualAppreciationPercent) : undefined),
    offer_status: financials.offer_status,
    accepted_price: financials.accepted_price,
    contract_executed_date: financials.contract_executed_date,
    inspection_status: financials.inspection_status,
    inspection_findings: financials.inspection_findings,
    radon_test_status: financials.radon_test_status,
    radon_test_result: financials.radon_test_result,
    lead_test_status: financials.lead_test_status,
    lead_test_result: financials.lead_test_result,
    termite_test_status: financials.termite_test_status,
    termite_test_result: financials.termite_test_result,
    inspector_flagged_specialty_tests: financials.inspector_flagged_specialty_tests,
    age_conditional_tests_elected: financials.age_conditional_tests_elected,
    phase_i_esa_status: financials.phase_i_esa_status,
    phase_i_esa_findings: financials.phase_i_esa_findings,
    has_hoa: financials.has_hoa,
    hoa_dues: financials.hoa_dues,
    title_company: financials.title_company,
    contingencies: financials.contingencies || [],
    dd_decision: financials.dd_decision,
    dd_decision_reason: financials.dd_decision_reason,
    capital_intent: financials.capital_intent,
    one_pager_reviewed: financials.one_pager_reviewed,
    loi_log: financials.loi_log || [],
    equity_target: financials.equity_target,
    fundingPlan: project.fundingPlan || financials.fundingPlan || undefined,
    funding_modality: project.funding_modality || financials.funding_modality || (project.fundingPlan?.modality || financials.fundingPlan?.modality) || undefined,
    capitalSources: project.capitalSources || financials.capitalSources || [],
    capital_source: project.capital_source || financials.capital_source || project.capitalSources || financials.capitalSources || [],
    equityParties: project.equityParties || financials.equityParties || [],
    equity_party: project.equity_party || financials.equity_party || project.equityParties || financials.equityParties || [],
    loans: project.loans || financials.loans || [],
    contributions: project.contributions || financials.contributions || [],
    titleHolding: project.titleHolding || financials.titleHolding || undefined,
    title_holding: project.title_holding || financials.title_holding || project.titleHolding || financials.titleHolding || undefined,
    distribution_structure: project.distribution_structure || financials.distribution_structure || undefined,
    milestoneTimeline: project.milestoneTimeline || financials.milestoneTimeline || undefined,
    closingRecord: project.closingRecord || financials.closingRecord || undefined,
    overrideReason: project.overrideReason || financials.overrideReason || undefined,

    radonDocumentUrl: financials.radonDocumentUrl,
    radonDocumentName: financials.radonDocumentName,
    leadDocumentUrl: financials.leadDocumentUrl,
    leadDocumentName: financials.leadDocumentName,
    termiteDocumentUrl: financials.termiteDocumentUrl,
    termiteDocumentName: financials.termiteDocumentName,
    offer_price: financials.offer_price,
    earnest_money: financials.earnest_money,
    offer_terms: financials.offer_terms,
    currentPhase: derivedPhase,
    phaseStatus: derivedPhaseStatus,
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

function mapStatusToSellerResponse(status: string | null | undefined): any {
  if (!status) return undefined;
  const s = status.toLowerCase();
  if (s === 'accepted') return 'ACCEPTED';
  if (s === 'rejected') return 'REJECTED';
  if (s === 'countered') return 'COUNTERED';
  if (s === 'submitted' || s === 'offer sent') return 'PENDING';
  return undefined;
}
