/**
 * PaperWorking Legal & Financial Accuracy Engine — Form 8825 & Safe Harbor Rules
 * 
 * Form 8825: Rental Real Estate Income and Expenses of a Partnership or an S Corporation.
 * Small Taxpayer Safe Harbor ($2,500 de minimis capitalization threshold).
 * Real Estate Professional Status (REPS) Material Participation helper.
 */

export interface Form8825PropertyAllocation {
  propertyAddress: string;
  grossRents: number;
  totalExpenses: number;
  netRentalIncome: number;
  ownershipPercentage: number;
  allocatedNetIncome: number;
}

export interface Form8825Result {
  entityName: string;
  properties: Form8825PropertyAllocation[];
  totalEntityGrossRents: number;
  totalEntityExpenses: number;
  totalEntityNetIncome: number;
}

/**
 * Calculates Form 8825 multi-member partnership rental allocations across properties
 */
export function calculateForm8825(
  entityName: string,
  properties: {
    propertyAddress: string;
    grossRents: number;
    totalExpenses: number;
    ownershipPercentage: number;
  }[]
): Form8825Result {
  let totalGross = 0;
  let totalExp = 0;
  let totalNet = 0;

  const allocations: Form8825PropertyAllocation[] = properties.map((p) => {
    const netIncome = p.grossRents - p.totalExpenses;
    const allocatedNet = Number((netIncome * (p.ownershipPercentage / 100)).toFixed(2));

    totalGross += p.grossRents;
    totalExp += p.totalExpenses;
    totalNet += allocatedNet;

    return {
      propertyAddress: p.propertyAddress,
      grossRents: p.grossRents,
      totalExpenses: p.totalExpenses,
      netRentalIncome: netIncome,
      ownershipPercentage: p.ownershipPercentage,
      allocatedNetIncome: allocatedNet,
    };
  });

  return {
    entityName,
    properties: allocations,
    totalEntityGrossRents: Number(totalGross.toFixed(2)),
    totalEntityExpenses: Number(totalExp.toFixed(2)),
    totalEntityNetIncome: Number(totalNet.toFixed(2)),
  };
}

export interface DeMinimisSafeHarborCheck {
  itemDescription: string;
  itemCost: number;
  qualifiesForDeMinimisSafeHarbor: boolean;
  treatment: 'Expensed Immediately (De Minimis Safe Harbor)' | 'Capitalized & Depreciated (MACRS)';
  thresholdLimit: number;
}

/**
 * Validates Small Taxpayer De Minimis Safe Harbor ($2,500 per item / invoice limit under Reg. § 1.263(a)-1(f))
 */
export function checkDeMinimisSafeHarbor(
  itemDescription: string,
  itemCost: number,
  hasApplicableFinancialStatement: boolean = false
): DeMinimisSafeHarborCheck {
  const threshold = hasApplicableFinancialStatement ? 5000 : 2500;
  const qualifies = itemCost <= threshold;

  return {
    itemDescription,
    itemCost,
    qualifiesForDeMinimisSafeHarbor: qualifies,
    treatment: qualifies
      ? 'Expensed Immediately (De Minimis Safe Harbor)'
      : 'Capitalized & Depreciated (MACRS)',
    thresholdLimit: threshold,
  };
}

export interface MaterialParticipationCheck {
  annualHoursRealEstateServices: number;
  percentageRealEstateTrades: number;
  qualifiesForREPS: boolean;
  repsNotice: string;
}

/**
 * Checks Real Estate Professional Status (REPS) Material Participation (IRC § 469(c)(7))
 * Criteria: > 750 hours in real property trades AND > 50% of personal service hours
 */
export function checkRealEstateProfessionalStatus(
  annualHoursRealEstateServices: number,
  totalPersonalServiceHours: number
): MaterialParticipationCheck {
  const pctRealEstate = totalPersonalServiceHours > 0
    ? (annualHoursRealEstateServices / totalPersonalServiceHours) * 100
    : 0;

  const qualifies = annualHoursRealEstateServices >= 750 && pctRealEstate > 50;

  return {
    annualHoursRealEstateServices,
    percentageRealEstateTrades: Number(pctRealEstate.toFixed(1)),
    qualifiesForREPS: qualifies,
    repsNotice: qualifies
      ? 'Qualifies for Real Estate Professional Status (REPS). Rental losses may offset active income.'
      : 'Does not qualify for REPS. Passive loss limits ($25,000 allowance with AGI phaseout) apply.',
  };
}
