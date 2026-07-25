import type { Project } from "@/types/schema";

/**
 * Syncs project data from Acquisition phase (Phase 1) to Fund phase (Phase 2).
 */
export function onFundPhaseEnter(project: Project): Partial<Project> {
  const financials = project.financials || {};
  const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? 0;
  const arv = project.arv ?? financials.estimatedARV ?? 0;
  
  // Set actuals from underwriting targets
  const updatedFinancials = {
    ...financials,
    purchasePriceActual: financials.purchasePriceActual || purchasePrice,
    arvActual: financials.arvActual || arv,
    rehabBudgetActual: financials.rehabBudgetActual || (financials.rehabBudget ?? financials.projectedRehabCost ?? 0),
  };

  const updates: Partial<Project> = {
    financials: updatedFinancials,
  };

  // Convert LOI details to Closing Checklist items if any LOIs exist
  if (project.loiDocuments && project.loiDocuments.length > 0) {
    const activeLoi = project.loiDocuments.find(l => l.status === 'Signed');
    if (activeLoi) {
      const checklist = project.closingChecklist || [];
      const hasLoiCheck = checklist.some(c => c.notes && c.notes.includes('LOI'));
      if (!hasLoiCheck) {
        updates.closingChecklist = [
          ...checklist,
          {
            id: `loi-closing-${Date.now()}`,
            type: 'Signed Purchase Contract',
            completed: true,
            notes: `LOI Terms Reconciled for Signed LOI (Entity: ${activeLoi.legalEntityName || 'Unknown'}).`,
          }
        ];
      }
    }
  }

  return updates;
}

/**
 * Syncs project data from Fund phase (Phase 2) to Hold phase (Phase 3).
 */
export function onHoldPhaseEnter(project: Project): Partial<Project> {
  const financials = project.financials || {};
  const team = project.projectTeam || [];

  // Carry over loan terms to Hold debt records
  const updatedFinancials = {
    ...financials,
    debtServiceMonthly: financials.debtServiceMonthly || (financials.annualDebtService ? financials.annualDebtService / 12 : 0),
    actualClosingCosts: financials.actualClosingCosts || financials.closingCosts || 0,
  };

  const updates: Partial<Project> = {
    financials: updatedFinancials,
  };

  // Carry over contractor & property manager from Project Team to Hold/Rehab entities
  const pm = team.find(t => t.projectRole?.toLowerCase().includes('property manager') || t.projectRole?.toLowerCase().includes('pm'));
  const contractor = team.find(t => t.projectRole?.toLowerCase().includes('contractor') || t.projectRole?.toLowerCase().includes('gc') || t.projectRole?.toLowerCase().includes('officer'));

  if (pm) {
    updates.holdCost = {
      ...project.holdCost,
      periods: project.holdCost?.periods || [],
      propertyManagerName: project.holdCost?.propertyManagerName || pm.displayName,
      propertyManagerEmail: project.holdCost?.propertyManagerEmail || pm.email,
    };
  }

  if (contractor) {
    updates.rehab = {
      ...project.rehab,
      gcName: project.rehab?.gcName || contractor.displayName,
      gcEmail: project.rehab?.gcEmail || contractor.email,
    };
  }

  return updates;
}

/**
 * Syncs project data from Hold phase (Phase 3) to Exit phase (Phase 4).
 */
export function onExitPhaseEnter(project: Project): Partial<Project> {
  const financials = project.financials || {};
  const rehab = project.rehab || {};
  const holdCost = project.holdCost;

  // Aggregate actual costs incurred during Rehab & Hold
  const totalRehabActual = rehab.actualRehabCosts ?? financials.rehabActual ?? 0;
  const totalHoldActual = holdCost?.totalHoldingCostsIncurred ?? financials.rehabActual ?? 0; // fallback if no direct hold costs

  const updatedFinancials = {
    ...financials,
    exitRehabCostsActual: totalRehabActual,
    exitHoldingCostsActual: totalHoldActual,
    exitPurchasePriceActual: financials.purchasePriceActual || financials.purchasePrice || 0,
  };

  const updates: Partial<Project> = {
    financials: updatedFinancials,
  };

  return updates;
}
