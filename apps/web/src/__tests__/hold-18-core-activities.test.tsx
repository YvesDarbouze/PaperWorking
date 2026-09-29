/**
 * Test Suite: REIL Hold Phase - 18 Core Activities & Conversational Asset Management
 *
 * Verifies the 18 core activities grouped across the 3 pillars:
 * 1. 🛠️ Property Renovation & Development (7 tasks)
 * 2. 💰 Financial Management & Carrying Costs (7 tasks)
 * 3. 📊 Asset & Property Management (4 tasks)
 *
 * Plus:
 * - TurboTax / Clerky conversational progressive disclosure
 * - Team member assignment & subscription tier gating
 * - Licensed vendor marketplace requests
 * - Radix Lyra design compliance and strict Anti-Slop copy rules
 */

import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import {
  HoldConversationalEngine,
  HoldRenovationDevelopmentTasks,
  HoldFinancialCarryingTasks,
  HoldAssetManagementTasks,
} from '../../components/projects/hold';
import type { ProjectWorkspace } from '../../lib/projects/types';

describe('REIL Hold Phase: 18 Core Activities & Conversational Architecture', () => {
  const mockProject: ProjectWorkspace = {
    id: 'proj-hold-18-test',
    project_id: 'proj-hold-18-test',
    propertyName: '1247 East 7th Street Triplex',
    address: '1247 East 7th Street, Austin, TX 78702',
    property_address: '1247 East 7th Street, Austin, TX 78702',
    city: 'Austin',
    currentPhase: 'hold',
    phase: 'hold',
    status: 'In Rehabilitation',
    dispositionType: 'RENT',
    purchasePrice: 485000,
    purchase_price: 485000,
    rehab_costs: 65000,
    exit_strategy: 'Buy & Hold Rental',
    entity_type: 'Texas Series LLC',
    storage_used_bytes: 12000000,
    storageQuotaBytes: 524288000,
    phase_completion_pct: 45,
    dealId: 'deal-tx-austin-1247',
    todos: [],
    documents: [],
    funding: {
      loanAmount: 363750,
      interestRatePct: 6.875,
      amortizationYears: 30,
      monthlyDebtService: 2390,
      loanType: 'Bridge / Rehab Loan',
      lenderName: 'Apex Commercial Lending',
    },
    underwriting: {
      rentRoll: {
        grossScheduledRent: 4200,
      },
    } as any,
    teamMembers: [
      { id: 'tm-1', name: 'Marcus Vance', role: 'General Contractor' },
      { id: 'tm-2', name: 'Elena Rostova', role: 'Property Manager' },
    ],
  };

  describe('Pillar 1: 🛠️ Property Renovation & Development (7 Tasks)', () => {
    const mockSowItems = [
      {
        id: 'sow-1',
        category: 'Demolition & Prep',
        description: 'Interior tear-out and dumpster service',
        contractor: 'Apex Demo Services LLC',
        budgetedAmount: 6500,
        actualAmount: 6200,
        completionPct: 100,
        status: 'completed' as const,
        engineeringRequired: false,
      },
    ];

    const mockPermits = [
      {
        id: 'prm-1',
        permitNumber: 'BP-2026-019482',
        type: 'building' as const,
        jurisdiction: 'City of Austin Development Services',
        appliedDate: '2026-01-15',
        approvedDate: '2026-01-28',
        status: 'approved' as const,
      },
    ];

    const mockContractors = [
      {
        id: 'ctr-1',
        name: 'Apex Construction Group LLC',
        trade: 'General Contractor',
        licenseNumber: 'TX-GC-92841',
        insuranceExpDate: '2026-11-30',
        phone: '(512) 555-0142',
        status: 'active' as const,
        hasCoiVerified: true,
      },
    ];

    const mockInspections = [
      {
        id: 'insp-1',
        title: 'Rough MEP & Framing Walkthrough',
        stage: 'mep_rough' as const,
        inspector: 'City Building Inspector J. Harris',
        date: '2026-02-28',
        status: 'passed' as const,
        findings: 'Electrical grounding and PEX water lines verified.',
        actionRequired: false,
      },
    ];

    const mockDraws = [
      {
        id: 'drw-1',
        drawNumber: 1,
        amountRequested: 22000,
        retainageAmount: 2200,
        amountApproved: 19800,
        lenderInspector: 'Trinity Inspection Group',
        status: 'funded' as const,
        requestedDate: '2026-02-05',
        fundedDate: '2026-02-10',
      },
    ];

    const mockGroundUp = [
      {
        id: 'gum-1',
        milestone: 'grading_earthwork' as const,
        label: 'Civil Grading & Soil Compaction',
        targetDate: '2026-01-20',
        status: 'completed' as const,
        engineeringSignoff: true,
      },
    ];

    it('renders all 7 renovation and development activities with context and benchmarks', () => {
      const html = renderToString(
        <HoldRenovationDevelopmentTasks
          project={mockProject}
          sowItems={mockSowItems}
          onUpdateSowItems={jest.fn()}
          permits={mockPermits}
          onUpdatePermits={jest.fn()}
          contractors={mockContractors}
          onUpdateContractors={jest.fn()}
          inspections={mockInspections}
          onUpdateInspections={jest.fn()}
          draws={mockDraws}
          onUpdateDraws={jest.fn()}
          groundUpMilestones={mockGroundUp}
          onUpdateGroundUpMilestones={jest.fn()}
          userTier="Investment Team"
          propertyState="TX"
        />
      );

      // Verify all 7 Task Cards are present
      expect(html).toContain('data-testid="task-card-sow-finalization"');
      expect(html).toContain('Scope of Work (SOW) Finalization');
      expect(html).toContain('Detail specific construction plans, architectural designs, and engineering requirements');

      expect(html).toContain('data-testid="task-card-permits-zoning"');
      expect(html).toContain('Permit &amp; Zoning Procurement');
      expect(html).toContain('BP-2026-019482');

      expect(html).toContain('data-testid="task-card-contractor-management"');
      expect(html).toContain('Contractor Management');
      expect(html).toContain('COI Verified');

      expect(html).toContain('data-testid="task-card-rehab-execution"');
      expect(html).toContain('Rehab &amp; Refurbishment Execution');

      expect(html).toContain('data-testid="task-card-ground-up"');
      expect(html).toContain('Ground-Up Development Oversight');
      expect(html).toContain('Civil Grading &amp; Soil Compaction');

      expect(html).toContain('data-testid="task-card-quality-control"');
      expect(html).toContain('Quality Control Inspections');
      expect(html).toContain('Rough MEP &amp; Framing Walkthrough');

      expect(html).toContain('data-testid="task-card-draw-requests"');
      expect(html).toContain('Draw Request Management');
      expect(html).toContain('$19,800 Approved');
    });
  });

  describe('Pillar 2: 💰 Financial Management & Carrying Costs (7 Tasks)', () => {
    const mockDebt = {
      monthlyPayment: 2390,
      paymentType: 'interest_only' as const,
      lenderName: 'Apex Commercial Lending',
      dueDay: 1,
      autopayEnabled: true,
      lastPaymentDate: '2026-03-01',
    };

    const mockTaxes = {
      countyParcelId: 'TCAD-849201',
      annualTaxAmount: 5760,
      monthlyEscrowAmount: 480,
      appealStatus: 'not_applicable' as const,
      nextDueDate: '2026-10-31',
      assessedValue: 470000,
    };

    const mockInsurance = {
      policyType: 'builders_risk' as const,
      carrier: 'Travelers Specialty',
      policyNumber: 'BR-2026-8941',
      annualPremium: 3120,
      monthlyPremium: 260,
      coverageLimit: 600000,
      expirationDate: '2026-09-30',
      transitionReady: false,
    };

    const mockUtilities = [
      { id: 'util-1', type: 'electricity' as const, provider: 'Austin Energy', accountNumber: 'AE-88910', monthlyBudget: 110, meterActive: true },
    ];

    const mockHoa = {
      hasHoa: false,
      monthlyDues: 0,
      dueDay: 1,
      goodStanding: true,
    };

    const mockCapex = [
      { id: 'cap-1', title: 'Complete Roof Shingle Tear-off', category: 'roofing' as const, amount: 9800, dateCapitalized: '2026-02-15', recoveryYears: 27.5, isCapitalizedForTax: true },
    ];

    const mockBookkeeping = {
      initialHoldingBudget: 35000,
      actualHoldingSpend: 11400,
      projectedCarryingAtExit: 32000,
      varianceAmount: -3000,
      variancePct: -8.5,
      hasOverrunWarning: false,
    };

    it('renders all 7 financial and carrying cost activities', () => {
      const html = renderToString(
        <HoldFinancialCarryingTasks
          project={mockProject}
          debtService={mockDebt}
          onUpdateDebtService={jest.fn()}
          propertyTax={mockTaxes}
          onUpdatePropertyTax={jest.fn()}
          insurance={mockInsurance}
          onUpdateInsurance={jest.fn()}
          utilities={mockUtilities}
          onUpdateUtilities={jest.fn()}
          hoa={mockHoa}
          onUpdateHoa={jest.fn()}
          capexItems={mockCapex}
          onUpdateCapexItems={jest.fn()}
          bookkeepingSummary={mockBookkeeping}
          onUpdateBookkeepingSummary={jest.fn()}
          userTier="Investment Team"
          propertyState="TX"
        />
      );

      // Verify all 7 Task Cards are present
      expect(html).toContain('data-testid="task-card-debt-service"');
      expect(html).toContain('Debt Service Payments');
      expect(html).toContain('Apex Commercial Lending');

      expect(html).toContain('data-testid="task-card-property-tax"');
      expect(html).toContain('Property Tax Management');
      expect(html).toContain('TCAD-849201');

      expect(html).toContain('data-testid="task-card-insurance"');
      expect(html).toContain('Insurance Maintenance');
      expect(html).toContain('Builder&#x27;s Risk Policy (Under Renovation)');

      expect(html).toContain('data-testid="task-card-utilities"');
      expect(html).toContain('Utility Management');
      expect(html).toContain('Austin Energy');

      expect(html).toContain('data-testid="task-card-hoa"');
      expect(html).toContain('HOA/COA Fee Compliance');
      expect(html).toContain('Standalone (No HOA/COA)');

      expect(html).toContain('data-testid="task-card-capex"');
      expect(html).toContain('Capital Expenditure (CapEx) Tracking');
      expect(html).toContain('Complete Roof Shingle Tear-off');

      expect(html).toContain('data-testid="task-card-bookkeeping"');
      expect(html).toContain('Bookkeeping &amp; Cash Flow Monitoring');
      expect(html).toContain('$35,000');
    });
  });

  describe('Pillar 3: 📊 Asset & Property Management (4 Tasks)', () => {
    const mockStabilization = {
      punchListRemainingCount: 6,
      certificateOfOccupancyObtained: false,
      deepCleaningCompleted: false,
      stagingCompleted: false,
      readyForMarketing: false,
    };

    const mockPM = {
      isSelfManaged: false,
      companyName: 'Pioneer Austin Management',
      leadManagerName: 'Elena Rostova',
      feePct: 8.0,
      leaseUpFeeAmount: 1900,
      phone: '(512) 555-0199',
      email: 'elena@pioneeraustin.com',
      contractSigned: true,
    };

    const mockSecurity = {
      hasCellularCameras: true,
      hasSmartLockbox: true,
      hasMotionLighting: true,
      lockboxCodeLastRotated: '2026-03-01',
      weeklySiteWalkLogged: true,
      squatterPreventionProtocolActive: true,
    };

    const mockRoutine = [
      { id: 'maint-1', service: 'lawn_care' as const, provider: 'GreenThumb Pro Landscaping', frequency: 'biweekly' as const, costPerVisit: 85, nextScheduledDate: '2026-03-25', status: 'active' as const },
    ];

    it('renders all 4 asset and property management activities', () => {
      const html = renderToString(
        <HoldAssetManagementTasks
          project={mockProject}
          stabilization={mockStabilization}
          onUpdateStabilization={jest.fn()}
          propertyManager={mockPM}
          onUpdatePropertyManager={jest.fn()}
          siteSecurity={mockSecurity}
          onUpdateSiteSecurity={jest.fn()}
          routineMaintenance={mockRoutine}
          onUpdateRoutineMaintenance={jest.fn()}
          userTier="Investment Team"
          propertyState="TX"
        />
      );

      // Verify all 4 Task Cards are present
      expect(html).toContain('data-testid="task-card-stabilization"');
      expect(html).toContain('Property Stabilization Preparation');
      expect(html).toContain('Certificate of Occupancy (CO)');

      expect(html).toContain('data-testid="task-card-property-manager"');
      expect(html).toContain('Property Manager Oversight');
      expect(html).toContain('Pioneer Austin Management');

      expect(html).toContain('data-testid="task-card-security"');
      expect(html).toContain('Security &amp; Vacancy Maintenance');
      expect(html).toContain('Cellular Solar Cameras');
      expect(html).toContain('Squatter Prevention');

      expect(html).toContain('data-testid="task-card-routine-maintenance"');
      expect(html).toContain('Routine Maintenance Scheduling');
      expect(html).toContain('GreenThumb Pro Landscaping');
    });
  });

  describe('Anti-Slop Copy & Radix Lyra Compliance across 18 Tasks', () => {
    it('contains zero em-dashes and zero prohibited terms across all generated markup', () => {
      const html = renderToString(
        <HoldConversationalEngine
          project={mockProject}
          onUpdateProject={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
          userTier="Investment Team"
          propertyState="TX"
        />
      );

      // Strict Anti-Slop: zero em-dashes
      expect(html).not.toContain('—');
      expect(html).not.toContain('&mdash;');

      // Strict Anti-Slop: zero prohibited terms (never use "s-p-o-n-s-o-r")
      expect(html.toLowerCase()).not.toContain('sponsor');
      expect(html.toLowerCase()).not.toContain('sponsorship');

      // Radix Lyra: rounded-none precision styling
      expect(html).toContain('rounded-none');
    });
  });
});
