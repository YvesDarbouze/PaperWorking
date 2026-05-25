import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { PropertyMetricSnapshot, Project } from '@/types/schema';

export interface PortfolioMetricSnapshot {
  organizationId: string;
  period: string;
  periodType: 'monthly' | 'quarterly' | 'annual';
  date: Date;

  // 10 financial metrics + IRR
  noi: number | null;
  annualCashFlow: number | null;
  monthlyCashFlow: number | null;
  capRate: number | null;
  cashOnCashReturn: number | null;
  grossRentMultiplier: number | null;
  dscr: number | null;
  ltv: number | null;
  oer: number | null;
  occupancyRate: number | null;
  irr: number | null;
  appreciation: number | null;

  // Aggregated component fields
  propertyValue: number | null;
  totalCashInvested: number | null;
  grossRentalIncome: number | null;
  annualDebtService: number | null;
  loanAmount: number | null;
  totalOperatingExpenses: number | null;
  grossOperatingIncome: number | null;
  occupiedUnits: number | null;
  numberOfUnits: number | null;
}

/**
 * A client hook to retrieve dynamically aggregated, portfolio-weighted time-series snapshots
 * for the current authenticated user's organization.
 * 
 * @param periodType - Optional filter for the type of period ('monthly' | 'quarterly' | 'annual').
 * @param projects - Optional list of projects used to apply ownershipPercentage scaling for 'myShare' scope.
 * @param scope - Optional scope ('property' | 'myShare').
 */
export function usePortfolioMetricSnapshots(
  periodType?: 'monthly' | 'quarterly' | 'annual',
  projects?: Project[],
  scope?: 'property' | 'myShare'
) {
  const { profile } = useAuth();
  const { activeTenantId } = useTenant();
  const [snapshots, setSnapshots] = useState<PortfolioMetricSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const orgId = activeTenantId;
    if (!orgId || orgId === 'org_placeholder') {
      setSnapshots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'propertyMetricSnapshots'),
      where('organizationId', '==', orgId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rawDocs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            date: data.date?.toDate?.() ?? data.date ?? new Date(),
            createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? new Date(),
          } as PropertyMetricSnapshot;
        });

        // Filter by periodType in memory
        let filteredDocs = periodType
          ? rawDocs.filter((doc) => doc.periodType === periodType)
          : rawDocs;

        // Filter by active projects if provided
        if (projects) {
          const projectIds = new Set(projects.map((p) => p.id));
          filteredDocs = filteredDocs.filter((doc) => projectIds.has(doc.projectId));
        }

        // Group snapshots by period
        const groups: Record<string, PropertyMetricSnapshot[]> = {};
        for (const doc of filteredDocs) {
          if (!groups[doc.period]) {
            groups[doc.period] = [];
          }
          groups[doc.period].push(doc);
        }

        // Aggregate for each period
        const aggregated: PortfolioMetricSnapshot[] = Object.keys(groups).map((period) => {
          const groupSnapshots = groups[period];
          const firstSnapshot = groupSnapshots[0];

          // Sum helper for basic metrics
          const sumField = (field: keyof PropertyMetricSnapshot): { sum: number; hasValue: boolean } => {
            let sum = 0;
            let hasValue = false;
            for (const s of groupSnapshots) {
              const val = s[field];
              if (val !== null && typeof val === 'number') {
                let factor = 1;
                if (scope === 'myShare' && projects) {
                  const proj = projects.find(p => p.id === s.projectId);
                  if (proj) {
                    factor = ((proj.financials as any)?.ownershipPercentage ?? 100) / 100;
                  }
                }
                sum += val * factor;
                hasValue = true;
              }
            }
            return { sum, hasValue };
          };

          const noiData = sumField('noi');
          const acfData = sumField('annualCashFlow');
          const mcfData = sumField('monthlyCashFlow');
          const valData = sumField('propertyValue');
          const cashInvestedData = sumField('totalCashInvested');
          const rentalIncomeData = sumField('grossRentalIncome');
          const debtServiceData = sumField('annualDebtService');
          const loanAmountData = sumField('loanAmount');
          const operatingExpensesData = sumField('totalOperatingExpenses');
          const grossOperatingIncomeData = sumField('grossOperatingIncome');
          const occupiedUnitsData = sumField('occupiedUnits');
          const numberOfUnitsData = sumField('numberOfUnits');

          // Summed components
          const noi = noiData.hasValue ? noiData.sum : null;
          const annualCashFlow = acfData.hasValue ? acfData.sum : null;
          const monthlyCashFlow = mcfData.hasValue ? mcfData.sum : null;
          const propertyValue = valData.hasValue ? valData.sum : null;
          const totalCashInvested = cashInvestedData.hasValue ? cashInvestedData.sum : null;
          const grossRentalIncome = rentalIncomeData.hasValue ? rentalIncomeData.sum : null;
          const annualDebtService = debtServiceData.hasValue ? debtServiceData.sum : null;
          const loanAmount = loanAmountData.hasValue ? loanAmountData.sum : null;
          const totalOperatingExpenses = operatingExpensesData.hasValue ? operatingExpensesData.sum : null;
          const grossOperatingIncome = grossOperatingIncomeData.hasValue ? grossOperatingIncomeData.sum : null;
          const occupiedUnits = occupiedUnitsData.hasValue ? occupiedUnitsData.sum : null;
          const numberOfUnits = numberOfUnitsData.hasValue ? numberOfUnitsData.sum : null;

          // Cap Rate: Sum(noi) / Sum(propertyValue) * 100
          let capRateNoiSum = 0;
          let capRateValSum = 0;
          let hasCapRate = false;
          for (const s of groupSnapshots) {
            if (s.noi !== null && s.propertyValue !== null) {
              let factor = 1;
              if (scope === 'myShare' && projects) {
                const proj = projects.find(p => p.id === s.projectId);
                if (proj) {
                  factor = ((proj.financials as any)?.ownershipPercentage ?? 100) / 100;
                }
              }
              capRateNoiSum += s.noi * factor;
              capRateValSum += s.propertyValue * factor;
              hasCapRate = true;
            }
          }
          const capRate = (hasCapRate && capRateValSum > 0) ? (capRateNoiSum / capRateValSum) * 100 : null;

          // Cash-on-Cash Return: Sum(annualCashFlow) / Sum(totalCashInvested) * 100
          let cocCashFlowSum = 0;
          let cocInvestedSum = 0;
          let hasCoc = false;
          for (const s of groupSnapshots) {
            if (s.annualCashFlow !== null && s.totalCashInvested !== null) {
              let factor = 1;
              if (scope === 'myShare' && projects) {
                const proj = projects.find(p => p.id === s.projectId);
                if (proj) {
                  factor = ((proj.financials as any)?.ownershipPercentage ?? 100) / 100;
                }
              }
              cocCashFlowSum += s.annualCashFlow * factor;
              cocInvestedSum += s.totalCashInvested * factor;
              hasCoc = true;
            }
          }
          const cashOnCashReturn = (hasCoc && cocInvestedSum > 0) ? (cocCashFlowSum / cocInvestedSum) * 100 : null;

          // GRM: Sum(propertyValue) / Sum(grossRentalIncome)
          let grmValSum = 0;
          let grmRentalSum = 0;
          let hasGrm = false;
          for (const s of groupSnapshots) {
            if (s.propertyValue !== null && s.grossRentalIncome !== null) {
              let factor = 1;
              if (scope === 'myShare' && projects) {
                const proj = projects.find(p => p.id === s.projectId);
                if (proj) {
                  factor = ((proj.financials as any)?.ownershipPercentage ?? 100) / 100;
                }
              }
              grmValSum += s.propertyValue * factor;
              grmRentalSum += s.grossRentalIncome * factor;
              hasGrm = true;
            }
          }
          const grossRentMultiplier = (hasGrm && grmRentalSum > 0) ? (grmValSum / grmRentalSum) : null;

          // DSCR: Sum(noi) / Sum(annualDebtService)
          let dscrNoiSum = 0;
          let dscrDebtSum = 0;
          let hasDscr = false;
          for (const s of groupSnapshots) {
            if (s.noi !== null && s.annualDebtService !== null) {
              let factor = 1;
              if (scope === 'myShare' && projects) {
                const proj = projects.find(p => p.id === s.projectId);
                if (proj) {
                  factor = ((proj.financials as any)?.ownershipPercentage ?? 100) / 100;
                }
              }
              dscrNoiSum += s.noi * factor;
              dscrDebtSum += s.annualDebtService * factor;
              hasDscr = true;
            }
          }
          const dscr = (hasDscr && dscrDebtSum > 0) ? (dscrNoiSum / dscrDebtSum) : null;

          // LTV: Sum(loanAmount) / Sum(propertyValue) * 100
          let ltvLoanSum = 0;
          let ltvValSum = 0;
          let hasLtv = false;
          for (const s of groupSnapshots) {
            if (s.loanAmount !== null && s.propertyValue !== null) {
              let factor = 1;
              if (scope === 'myShare' && projects) {
                const proj = projects.find(p => p.id === s.projectId);
                if (proj) {
                  factor = ((proj.financials as any)?.ownershipPercentage ?? 100) / 100;
                }
              }
              ltvLoanSum += s.loanAmount * factor;
              ltvValSum += s.propertyValue * factor;
              hasLtv = true;
            }
          }
          const ltv = (hasLtv && ltvValSum > 0) ? (ltvLoanSum / ltvValSum) * 100 : null;

          // OER: Sum(totalOperatingExpenses) / Sum(grossRentalIncome) * 100
          let oerExpensesSum = 0;
          let oerRentalSum = 0;
          let hasOer = false;
          for (const s of groupSnapshots) {
            if (s.totalOperatingExpenses !== null && s.grossRentalIncome !== null) {
              let factor = 1;
              if (scope === 'myShare' && projects) {
                const proj = projects.find(p => p.id === s.projectId);
                if (proj) {
                  factor = ((proj.financials as any)?.ownershipPercentage ?? 100) / 100;
                }
              }
              oerExpensesSum += s.totalOperatingExpenses * factor;
              oerRentalSum += s.grossRentalIncome * factor;
              hasOer = true;
            }
          }
          const oer = (hasOer && oerRentalSum > 0) ? (oerExpensesSum / oerRentalSum) * 100 : null;

          // Occupancy Rate: Sum(occupiedUnits) / Sum(numberOfUnits) * 100
          // If no units are defined at all, fall back to simple average of occupancyRate
          let occupancyRate = null;
          let occupiedUnitsSum = 0;
          let totalUnitsSum = 0;
          let hasOccupancy = false;
          for (const s of groupSnapshots) {
            if (s.occupiedUnits !== null && s.numberOfUnits !== null) {
              let factor = 1;
              if (scope === 'myShare' && projects) {
                const proj = projects.find(p => p.id === s.projectId);
                if (proj) {
                  factor = ((proj.financials as any)?.ownershipPercentage ?? 100) / 100;
                }
              }
              occupiedUnitsSum += s.occupiedUnits * factor;
              totalUnitsSum += s.numberOfUnits * factor;
              hasOccupancy = true;
            }
          }
          if (hasOccupancy && totalUnitsSum > 0) {
            occupancyRate = (occupiedUnitsSum / totalUnitsSum) * 100;
          } else {
            let occSum = 0;
            let occCount = 0;
            for (const s of groupSnapshots) {
              if (s.occupancyRate !== null) {
                occSum += s.occupancyRate;
                occCount++;
              }
            }
            occupancyRate = occCount > 0 ? occSum / occCount : null;
          }

          // Weighted IRR: Sum(irr * totalCashInvested) / Sum(totalCashInvested)
          let irrWeightedSum = 0;
          let irrInvestedSum = 0;
          let hasIrr = false;
          for (const s of groupSnapshots) {
            if (s.irr !== null && s.totalCashInvested !== null) {
              let factor = 1;
              if (scope === 'myShare' && projects) {
                const proj = projects.find(p => p.id === s.projectId);
                if (proj) {
                  factor = ((proj.financials as any)?.ownershipPercentage ?? 100) / 100;
                }
              }
              irrWeightedSum += s.irr * (s.totalCashInvested * factor);
              irrInvestedSum += s.totalCashInvested * factor;
              hasIrr = true;
            }
          }
          const irr = (hasIrr && irrInvestedSum > 0) ? (irrWeightedSum / irrInvestedSum) : null;

          // Weighted Appreciation: Sum(appreciation * propertyValue) / Sum(propertyValue)
          let appreciationWeightedSum = 0;
          let appreciationValSum = 0;
          let hasAppreciation = false;
          for (const s of groupSnapshots) {
            const app = (s as any).appreciation;
            if (app !== null && app !== undefined && s.propertyValue !== null) {
              let factor = 1;
              if (scope === 'myShare' && projects) {
                const proj = projects.find(p => p.id === s.projectId);
                if (proj) {
                  factor = ((proj.financials as any)?.ownershipPercentage ?? 100) / 100;
                }
              }
              appreciationWeightedSum += app * (s.propertyValue * factor);
              appreciationValSum += s.propertyValue * factor;
              hasAppreciation = true;
            }
          }
          const appreciation = (hasAppreciation && appreciationValSum > 0) ? (appreciationWeightedSum / appreciationValSum) : null;

          return {
            organizationId: orgId,
            period,
            periodType: firstSnapshot.periodType,
            date: firstSnapshot.date,

            noi,
            annualCashFlow,
            monthlyCashFlow,
            capRate,
            cashOnCashReturn,
            grossRentMultiplier,
            dscr,
            ltv,
            oer,
            occupancyRate,
            irr,
            appreciation,

            propertyValue,
            totalCashInvested,
            grossRentalIncome,
            annualDebtService,
            loanAmount,
            totalOperatingExpenses,
            grossOperatingIncome,
            occupiedUnits,
            numberOfUnits,
          };
        });

        // Sort chronologically (ascending by date)
        const sortedAggregated = aggregated.sort((a, b) => {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return a.period.localeCompare(b.period);
        });

        setSnapshots(sortedAggregated);
        setLoading(false);
      },
      (err) => {
        console.error('[usePortfolioMetricSnapshots] listener error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeTenantId, periodType, projects, scope]);

  return { snapshots, loading, error };
}
