import type { Project } from '@/types/schema';

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-skyline-lofts',
    organizationId: 'org_demo_seed',
    ownerUid: 'demo_user',
    propertyName: 'Skyline Lofts',
    address: '456 Skyline Drive, Denver, CO 80202',
    status: 'Active',
    currentPhase: 3, // Hold
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    assetClass: 'Multi-Family',
    numberOfUnits: 12,
    occupiedUnits: 10,
    createdAt: new Date('2026-01-15T08:00:00Z'),
    updatedAt: new Date('2026-06-01T12:00:00Z'),
    members: {
      demo_user: {
        uid: 'demo_user',
        role: 'Lead Investor',
        joinedAt: new Date('2026-01-15T08:00:00Z'),
      }
    },
    financials: {
      purchasePrice: 450000,
      estimatedARV: 620000,
      estimatedCurrentValue: 620000,
      costs: [],
      // Monthly rent / vacancy
      monthlyGrossRent: 15000, // $15,000/mo gross rent
      projectedMonthlyRent: 15000,
      vacancyRatePercent: 16.7, // (12-10)/12 * 100
      // Debt stacks
      loanAmount: 315000,
      loanInterestRate: 6.5,
      loanTermYears: 30,
      // Rehab & basis
      projectedRehabCost: 50000,
      fixedAcquisitionCosts: 10000,
      // NOI components (converted to monthly equivalents)
      otherMonthlyIncome: 200,
      holdingCostTaxes: 400,
      holdingCostInsurance: 200,
      holdingCostUtilities: 300,
      propertyManagementFeePercent: 8,
      monthlyMaintenanceReserve: 500,
      monthlyHOA: 150,
    }
  },
  {
    id: 'demo-cedar-duplex',
    organizationId: 'org_demo_seed',
    ownerUid: 'demo_user',
    propertyName: 'Cedar Park Duplex',
    address: '789 Cedar Court, Austin, TX 78701',
    status: 'Active',
    currentPhase: 3, // Hold
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    assetClass: 'Residential',
    numberOfUnits: 2,
    occupiedUnits: 2,
    createdAt: new Date('2026-02-10T09:00:00Z'),
    updatedAt: new Date('2026-06-01T12:00:00Z'),
    members: {
      demo_user: {
        uid: 'demo_user',
        role: 'Lead Investor',
        joinedAt: new Date('2026-02-10T09:00:00Z'),
      }
    },
    financials: {
      purchasePrice: 280000,
      estimatedARV: 380000,
      estimatedCurrentValue: 380000,
      costs: [],
      // Monthly rent / vacancy
      monthlyGrossRent: 2450,
      projectedMonthlyRent: 2450,
      vacancyRatePercent: 0,
      // Debt stacks
      loanAmount: 196000,
      loanInterestRate: 6.0,
      loanTermYears: 30,
      // Rehab & basis
      projectedRehabCost: 15000,
      fixedAcquisitionCosts: 5000,
      // NOI components (converted to monthly equivalents)
      otherMonthlyIncome: 0,
      holdingCostTaxes: 266.67,
      holdingCostInsurance: 150,
      holdingCostUtilities: 0,
      propertyManagementFeePercent: 10,
      monthlyMaintenanceReserve: 200,
      monthlyHOA: 0,
    }
  },
  {
    id: 'demo-123-main-st',
    organizationId: 'org_demo_seed',
    ownerUid: 'demo_user',
    propertyName: '123 Main Street Flip',
    address: '123 Main Street, Miami, FL 33101',
    status: 'Renovating',
    currentPhase: 3, // Hold
    dispositionType: 'SALE',
    subStrategy: 'FLIP',
    assetClass: 'Residential',
    numberOfUnits: 1,
    occupiedUnits: 0,
    createdAt: new Date('2026-03-20T10:00:00Z'),
    updatedAt: new Date('2026-06-01T12:00:00Z'),
    members: {
      demo_user: {
        uid: 'demo_user',
        role: 'Lead Investor',
        joinedAt: new Date('2026-03-20T10:00:00Z'),
      }
    },
    financials: {
      purchasePrice: 200000,
      estimatedARV: 340000,
      estimatedCurrentValue: 340000,
      costs: [],
      // Monthly rent / vacancy
      monthlyGrossRent: 0,
      projectedMonthlyRent: 2200,
      vacancyRatePercent: 100,
      // Debt stacks
      loanAmount: 140000,
      loanInterestRate: 8.5,
      loanTermYears: 1, // Short-term flip loan
      // Rehab & basis
      projectedRehabCost: 60000,
      fixedAcquisitionCosts: 6000,
      // NOI components (converted to monthly equivalents)
      otherMonthlyIncome: 0,
      holdingCostTaxes: 166.67,
      holdingCostInsurance: 100,
      holdingCostUtilities: 150,
      propertyManagementFeePercent: 0,
      monthlyMaintenanceReserve: 0,
      monthlyHOA: 0,
    }
  }
];
