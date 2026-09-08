/**
 * Rent Roll & Tenant Ledger Engine (@/lib/reports/rent-roll.ts)
 *
 * Implements unit-level leasing calculations:
 * 1. Physical occupancy % (Occupied Units / Total Units)
 * 2. Gross Potential Rent (GPR) vs. Leased Actual Rent
 * 3. Unit delinquency tracking & tenant security deposits
 * 4. Minimal Firestore schemas for Leases, Tenants, and Rent Payments
 */

export type UnitOccupancyStatus = 'occupied' | 'vacant' | 'delinquent';

export interface RentRollUnit {
  id: string;
  unitNumber: string;
  tenantName: string | null;
  tenantEmail?: string | null;
  leaseStart: string | null; // YYYY-MM-DD
  leaseEnd: string | null; // YYYY-MM-DD
  monthlyMarketRent: number; // GPR base
  monthlyLeasedRent: number; // In-place contract rent
  depositHeld: number; // Security deposit (liability)
  status: UnitOccupancyStatus;
  balanceDue: number; // >0 if delinquent
}

export interface TenantPaymentRecord {
  id: string;
  unitId: string;
  date: string;
  description: string;
  chargeAmount: number;
  paymentAmount: number;
  runningBalance: number;
}

export interface RentRollSummary {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  delinquentUnits: number;
  occupancyRatePct: number;
  grossPotentialRentMonthly: number;
  grossPotentialRentAnnual: number;
  leasedRentMonthly: number;
  leasedRentAnnual: number;
  leasedToGprPct: number;
  totalDepositsHeld: number;
  totalDelinquentBalance: number;
}

export interface ProjectRentRollReport {
  projectId: string;
  projectName: string;
  hasUnitData: boolean;
  units: RentRollUnit[];
  summary: RentRollSummary;
  ledger: TenantPaymentRecord[];
}

/**
 * Computes rent roll summary metrics with institutional precision.
 */
export function computeRentRollSummary(units: RentRollUnit[]): RentRollSummary {
  if (units.length === 0) {
    return {
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      delinquentUnits: 0,
      occupancyRatePct: 0,
      grossPotentialRentMonthly: 0,
      grossPotentialRentAnnual: 0,
      leasedRentMonthly: 0,
      leasedRentAnnual: 0,
      leasedToGprPct: 0,
      totalDepositsHeld: 0,
      totalDelinquentBalance: 0,
    };
  }

  const totalUnits = units.length;
  let occupiedCount = 0;
  let vacantCount = 0;
  let delinquentCount = 0;
  let gprMonthly = 0;
  let leasedMonthly = 0;
  let deposits = 0;
  let totalDelinquentBalance = 0;

  for (const u of units) {
    gprMonthly += u.monthlyMarketRent;
    deposits += u.depositHeld;

    if (u.status === 'vacant') {
      vacantCount += 1;
    } else {
      occupiedCount += 1;
      leasedMonthly += u.monthlyLeasedRent;
      if (u.status === 'delinquent' || u.balanceDue > 0) {
        delinquentCount += 1;
        totalDelinquentBalance += u.balanceDue;
      }
    }
  }

  const occupancyRatePct = Number(((occupiedCount / totalUnits) * 100).toFixed(1));
  const leasedToGprPct = gprMonthly > 0 ? Number(((leasedMonthly / gprMonthly) * 100).toFixed(1)) : 0;

  return {
    totalUnits,
    occupiedUnits: occupiedCount,
    vacantUnits: vacantCount,
    delinquentUnits: delinquentCount,
    occupancyRatePct,
    grossPotentialRentMonthly: Number(gprMonthly.toFixed(2)),
    grossPotentialRentAnnual: Number((gprMonthly * 12).toFixed(2)),
    leasedRentMonthly: Number(leasedMonthly.toFixed(2)),
    leasedRentAnnual: Number((leasedMonthly * 12).toFixed(2)),
    leasedToGprPct,
    totalDepositsHeld: Number(deposits.toFixed(2)),
    totalDelinquentBalance: Number(totalDelinquentBalance.toFixed(2)),
  };
}

/**
 * Builds project rent roll report or returns explicit hasUnitData: false state.
 */
export function buildProjectRentRollReport(
  project: {
    id: string;
    name?: string;
    unitsCount?: number | null;
    grossScheduledRentAnnual?: number | null;
    units?: RentRollUnit[];
  },
): ProjectRentRollReport {
  const pName = project.name || project.id;

  if (!project.units || project.units.length === 0) {
    return {
      projectId: project.id,
      projectName: pName,
      hasUnitData: false,
      units: [],
      summary: computeRentRollSummary([]),
      ledger: [],
    };
  }

  const summary = computeRentRollSummary(project.units);
  return {
    projectId: project.id,
    projectName: pName,
    hasUnitData: true,
    units: project.units,
    summary,
    ledger: [],
  };
}
