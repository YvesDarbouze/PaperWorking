import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Import adminDb via require to ensure dotenv runs first
const { adminDb: db } = require('../src/lib/firebase/admin');
import * as fs from 'fs';

// Helper to check for commit flag
const commitMode = process.argv.includes('--commit');

async function migrate() {
  console.log(`REIL v2 Schema Migration Script`);
  console.log(`Running in ${commitMode ? 'COMMIT' : 'DRY-RUN'} mode...\n`);

  const projectsSnapshot = await db.collection('projects').get();
  console.log(`Found ${projectsSnapshot.size} projects to process.`);

  const dryRunReport: string[] = [
    `# REIL v2 Migration Dry-Run Report`,
    `Run Date: ${new Date().toISOString()}`,
    `Total Projects Scanned: ${projectsSnapshot.size}`,
    `Commit Mode: ${commitMode}`,
    `---`
  ];

  for (const doc of projectsSnapshot.docs) {
    const project = doc.data();
    const projectId = doc.id;
    const propertyName = project.propertyName || 'Unnamed Property';
    const oldPhase = project.currentPhase;
    const oldPhaseStatus = project.phaseStatus;
    const strategy = project.dispositionType || project.strategyType || 'Buy & Hold';

    console.log(`\nProcessing Project [${projectId}]: "${propertyName}"`);
    dryRunReport.push(`\n## Project ID: ${projectId} ("${propertyName}")`);
    dryRunReport.push(`- **StrategyType**: ${strategy}`);
    dryRunReport.push(`- **Old Phase**: ${oldPhase} (Status: ${oldPhaseStatus})`);

    // A. Map currentPhase and phaseStatus
    let newPhase: number | string = 1;
    let newPhaseStatus = 'Phase 1: Acquisition';

    if (oldPhase === 'acquisition' || oldPhase === 1) {
      newPhase = 1;
      newPhaseStatus = 'Phase 1: Acquisition';
    } else if (oldPhase === 'purchase' || oldPhase === 'transaction' || oldPhase === 2) {
      newPhase = 2;
      newPhaseStatus = 'Phase 2: Transaction';
    } else if (oldPhase === 'hold' || oldPhase === 'rehab' || oldPhase === 3) {
      newPhase = 4; // Infer Hold / Exit (Phase 4) for hold phase projects as per prompt specification
      newPhaseStatus = 'Phase 4: Hold / Exit';
    } else if (oldPhase === 'exit' || oldPhase === 'hold_exit' || oldPhase === 4) {
      newPhase = 4;
      newPhaseStatus = 'Phase 4: Hold / Exit';
    } else {
      // Default fallback
      newPhase = 1;
      newPhaseStatus = 'Phase 1: Acquisition';
    }

    dryRunReport.push(`- **New Phase**: ${newPhase} (Status: ${newPhaseStatus})`);

    // B. Map financials.purchase fields to project.transaction
    const financials = project.financials || {};
    const transactionData: Record<string, any> = {};

    const transactionFields = [
      'financingType',
      'closingCosts',
      'totalCashInvested',
      'loanProcessorName',
      'closingAttorneyName',
      'inspectionCost',
      'titleSearchCost',
      'insuranceCost',
      'hoaMonthly'
    ];

    transactionFields.forEach(field => {
      if (financials[field] !== undefined) {
        transactionData[field] = financials[field];
      }
    });

    transactionData.vendorAssignments = project.transaction?.vendorAssignments || [];
    dryRunReport.push(`- **Transaction Mapped Fields**: ${Object.keys(transactionData).join(', ') || 'None'}`);

    // C. Promote nested rehab fields to top-level rehab
    const oldRehab = project.rehab || {};
    const rehabExpenses = project.rehabExpenses || [];
    const lineItems = oldRehab.lineItems || rehabExpenses.map((exp: any, index: number) => ({
      label: exp.description || exp.category || `Rehab Expense ${index + 1}`,
      amount: exp.amount || 0,
      tier: 'Rehab',
      vendor: exp.vendor || '',
      status: exp.status || 'Approved',
      photos: exp.receiptUrl ? [exp.receiptUrl] : [],
      receipts: exp.receiptUrl ? [exp.receiptUrl] : []
    })) || [];

    const rehabData = {
      lineItems,
      vendorAssignments: oldRehab.vendorAssignments || [],
      tier: oldRehab.tier || project.rehabTier || 'Rehab',
      startDate: oldRehab.startDate || project.holdStartDate || financials.holdStartDate || null,
      completedDate: oldRehab.completedDate || financials.rehabDoneDate || null,
      versionHistory: oldRehab.versionHistory || [],
      // Preserve any legacy fields to avoid UI compilation breakage
      scopeOfWork: oldRehab.scopeOfWork || [],
      contractorBids: oldRehab.contractorBids || [],
      drawSchedule: oldRehab.drawSchedule || [],
      currentStage: oldRehab.currentStage || 'Demolition',
      baseBudget: oldRehab.baseBudget || financials.rehabBudget || 0,
      contingencyBufferPercentage: oldRehab.contingencyBufferPercentage || 0,
      tasks: oldRehab.tasks || [],
      permits: oldRehab.permits || [],
      pendingReceipts: oldRehab.pendingReceipts || [],
      drawRequests: oldRehab.drawRequests || []
    };

    dryRunReport.push(`- **Rehab Line Items Count**: ${lineItems.length}`);
    dryRunReport.push(`- **Rehab Tier**: ${rehabData.tier}`);

    // D. Retroactively build holdCost.periods
    const start = project.acquisitionDate ? new Date(project.acquisitionDate.toDate ? project.acquisitionDate.toDate() : project.acquisitionDate) : new Date(project.createdAt?.toDate ? project.createdAt.toDate() : project.createdAt || Date.now());
    const end = financials.soldDate ? new Date(financials.soldDate.toDate ? financials.soldDate.toDate() : financials.soldDate) : new Date();

    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const targetEnd = new Date(end.getFullYear(), end.getMonth(), 1);

    if (current > targetEnd) {
      current = new Date(targetEnd.getFullYear(), targetEnd.getMonth(), 1);
    }

    const periods: any[] = [];
    let count = 0;
    while (current <= targetEnd && count < 120) {
      const periodStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      
      let phaseAtPeriod: 'acquisition' | 'transaction' | 'rehab' | 'hold_exit' = 'hold_exit';
      if (project.acquisitionDate) {
        const acqDate = new Date(project.acquisitionDate.toDate ? project.acquisitionDate.toDate() : project.acquisitionDate);
        if (current < new Date(acqDate.getFullYear(), acqDate.getMonth(), 1)) {
          phaseAtPeriod = 'acquisition';
        } else if (financials.rehabDoneDate) {
          const rehabDate = new Date(financials.rehabDoneDate.toDate ? financials.rehabDoneDate.toDate() : financials.rehabDoneDate);
          if (current < new Date(rehabDate.getFullYear(), rehabDate.getMonth(), 1)) {
            phaseAtPeriod = 'rehab';
          }
        }
      }

      const insurance = financials.holdingCostInsurance || 0;
      const propertyTax = financials.holdingCostTaxes || 0;
      const utilities = financials.holdingCostUtilities || 0;
      const maintenance = financials.holdingCostMaintenance || 0;
      const hoa = financials.monthlyHOA || financials.hoaMonthly || 0;
      
      let debtService = 0;
      if (financials.loanAmount && financials.loanInterestRate) {
        const annualInterest = financials.loanAmount * (financials.loanInterestRate / 100);
        debtService = Number((annualInterest / 12).toFixed(2));
      }

      const total = insurance + propertyTax + utilities + maintenance + hoa + debtService;

      periods.push({
        period: periodStr,
        phaseAtPeriod,
        insurance,
        propertyTax,
        maintenance,
        housekeeping: 0,
        utilities,
        hoa,
        debtService,
        otherCosts: [],
        total: Number(total.toFixed(2))
      });

      current.setMonth(current.getMonth() + 1);
      count++;
    }

    const holdCostData = { periods };
    dryRunReport.push(`- **Hold Cost Retroactive Periods**: ${periods.length} periods generated`);

    // E. Restructure project.exit and seed currentModality based on strategyType
    let currentModality: 'sale' | 'long_term_rental' | 'lease' | 'short_term_rental' | 'none' = 'none';
    if (newPhase === 4) {
      if (strategy === 'Fix & Flip' || strategy === 'Sell' || strategy === 'SALE') {
        currentModality = 'sale';
      } else {
        currentModality = 'long_term_rental';
      }
    }

    const monthlyRent = financials.actualRentalIncome || financials.projectedMonthlyRent || 0;
    const startPeriodStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

    const exitModalityHistory = project.exit?.modalityHistory || [{
      period: startPeriodStr,
      modality: currentModality,
      modalityStartDate: start.toISOString().split('T')[0],
      modalitySpecificFields: currentModality === 'sale' ? {
        salePrice: financials.actualSalePrice || 0,
        saleDate: financials.soldDate ? new Date(financials.soldDate.toDate ? financials.soldDate.toDate() : financials.soldDate).toISOString().split('T')[0] : '',
        sellingCosts: financials.sellingCosts || 0,
      } : {
        monthlyRent,
        leaseTerm: 12,
        tenantId: '',
      }
    }];

    const sale = financials.actualSalePrice ? {
      salePrice: financials.actualSalePrice,
      saleDate: financials.soldDate ? new Date(financials.soldDate.toDate ? financials.soldDate.toDate() : financials.soldDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      sellingCosts: financials.sellingCosts || 0,
    } : null;

    const exitData = {
      currentModality,
      modalityHistory: exitModalityHistory,
      sale,
      stabilizedRevenue: project.exit?.stabilizedRevenue || []
    };

    dryRunReport.push(`- **Exit Current Modality**: ${currentModality}`);
    dryRunReport.push(`- **Exit Has Sale Record**: ${!!sale}`);

    // Update payload
    const updatePayload: Record<string, any> = {
      currentPhase: newPhase,
      phaseStatus: newPhaseStatus,
      transaction: transactionData,
      rehab: rehabData,
      holdCost: holdCostData,
      exit: exitData,
      updatedAt: new Date(),
      migrationBackup_currentPhase: oldPhase || null,
      migrationBackup_phaseStatus: oldPhaseStatus || null
    };

    // Remove migrated fields from financials to prevent duplication
    const updatedFinancials = { ...financials };
    transactionFields.forEach(field => {
      delete updatedFinancials[field];
    });
    updatePayload.financials = updatedFinancials;

    if (commitMode) {
      await db.collection('projects').doc(projectId).update(updatePayload);
      console.log(`Successfully migrated Project ID ${projectId} in Firestore.`);
    } else {
      console.log(`[DRY-RUN] Would update Project ID ${projectId} with payload fields:`, Object.keys(updatePayload));
    }
  }

  // Save report
  const reportPath = path.join(__dirname, '../docs/architect/migration-dry-run.md');
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(reportPath, dryRunReport.join('\n'));
  console.log(`\nReport written to ${reportPath}`);
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed migration:', err);
    process.exit(1);
  });
