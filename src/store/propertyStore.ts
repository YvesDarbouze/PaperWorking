import { create } from 'zustand';
import { PropertyAsset, FinancialTransaction, PropertyUnit } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   Property Store — Global State Engine for Portfolio Accounting
   ═══════════════════════════════════════════════════════════════ */

interface PropertyState {
  properties: PropertyAsset[];
  transactions: FinancialTransaction[];
  isLoading: boolean;
  error: string | null;

  // Bulk setters (used by real-time sync hooks)
  setProperties: (properties: PropertyAsset[]) => void;
  setTransactions: (transactions: FinancialTransaction[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Properties
  addProperty: (property: PropertyAsset) => void;
  updateProperty: (propertyId: string, updates: Partial<PropertyAsset>) => void;
  deleteProperty: (propertyId: string) => void;

  // Actions - Units
  addUnitToProperty: (propertyId: string, unit: PropertyUnit) => void;
  updateUnit: (propertyId: string, unitId: string, updates: Partial<PropertyUnit>) => void;
  deleteUnit: (propertyId: string, unitId: string) => void;

  // Actions - Transactions
  addTransaction: (transaction: FinancialTransaction) => void;
  deleteTransaction: (transactionId: string) => void;
}

// Initial Mock State for Demonstration
const MOCK_PROPERTIES: PropertyAsset[] = [
  {
    id: 'prop-1',
    organizationId: 'org-1',
    name: 'Sunset Villas',
    address: '123 Sunset Blvd, Los Angeles, CA 90028',
    purchasePrice: 1200000,
    purchaseDate: new Date('2023-01-15'),
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    units: [
      { id: 'u1', propertyId: 'prop-1', name: 'Unit 101', status: 'Occupied', monthlyRentTarget: 2500 },
      { id: 'u2', propertyId: 'prop-1', name: 'Unit 102', status: 'Occupied', monthlyRentTarget: 2600 },
      { id: 'u3', propertyId: 'prop-1', name: 'Unit 103', status: 'Vacant', monthlyRentTarget: 2700 }
    ]
  },
  {
    id: 'prop-2',
    organizationId: 'org-1',
    name: 'Downtown Lofts',
    address: '456 Main St, Seattle, WA 98104',
    purchasePrice: 850000,
    purchaseDate: new Date('2024-03-22'),
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    units: [
      { id: 'u4', propertyId: 'prop-2', name: 'Loft A', status: 'Occupied', monthlyRentTarget: 3200 },
      { id: 'u5', propertyId: 'prop-2', name: 'Loft B', status: 'Under Rehab', monthlyRentTarget: 3500 }
    ]
  }
];

const MOCK_TRANSACTIONS: FinancialTransaction[] = [
  // Sunset Villas Transactions
  { id: 'tx-1', organizationId: 'org-1', amount: 2500, date: new Date('2024-04-01'), description: 'April Rent - 101', type: 'Income', category: 'Rent', linkedPropertyId: 'prop-1', linkedUnitId: 'u1' },
  { id: 'tx-2', organizationId: 'org-1', amount: 2600, date: new Date('2024-04-02'), description: 'April Rent - 102', type: 'Income', category: 'Rent', linkedPropertyId: 'prop-1', linkedUnitId: 'u2' },
  { id: 'tx-3', organizationId: 'org-1', amount: 450, date: new Date('2024-04-05'), description: 'Plumbing Repair', type: 'Expense', category: 'Maintenance', linkedPropertyId: 'prop-1' },
  
  // Downtown Lofts Transactions
  { id: 'tx-4', organizationId: 'org-1', amount: 3200, date: new Date('2024-04-01'), description: 'April Rent - Loft A', type: 'Income', category: 'Rent', linkedPropertyId: 'prop-2', linkedUnitId: 'u4' },
  { id: 'tx-5', organizationId: 'org-1', amount: 12000, date: new Date('2024-04-10'), description: 'Flooring Materials', type: 'Expense', category: 'Capital Expenditure', linkedPropertyId: 'prop-2', linkedUnitId: 'u5' },
];


export const usePropertyStore = create<PropertyState>((set) => ({
  properties: MOCK_PROPERTIES,
  transactions: MOCK_TRANSACTIONS,
  isLoading: false,
  error: null,

  // ── Bulk setters ────────────────────────────────────────
  setProperties: (properties) => set({ properties }),
  setTransactions: (transactions) => set({ transactions }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // ── Properties ──────────────────────────────────────────
  addProperty: (property) => set((state) => ({
    properties: [...state.properties, property]
  })),
  
  updateProperty: (propertyId, updates) => set((state) => ({
    properties: state.properties.map(p => 
      p.id === propertyId ? { ...p, ...updates, updatedAt: new Date() } : p
    )
  })),

  deleteProperty: (propertyId) => set((state) => ({
    properties: state.properties.filter(p => p.id !== propertyId),
    transactions: state.transactions.filter(t => t.linkedPropertyId !== propertyId) // Cascade delete
  })),

  // ── Units ───────────────────────────────────────────────
  addUnitToProperty: (propertyId, unit) => set((state) => ({
    properties: state.properties.map(p => 
      p.id === propertyId ? { ...p, units: [...p.units, unit], updatedAt: new Date() } : p
    )
  })),

  updateUnit: (propertyId, unitId, updates) => set((state) => ({
    properties: state.properties.map(p => 
      p.id === propertyId 
        ? { 
            ...p, 
            units: p.units.map(u => u.id === unitId ? { ...u, ...updates } : u),
            updatedAt: new Date() 
          } 
        : p
    )
  })),

  deleteUnit: (propertyId, unitId) => set((state) => ({
    properties: state.properties.map(p => 
      p.id === propertyId 
        ? { ...p, units: p.units.filter(u => u.id !== unitId), updatedAt: new Date() } 
        : p
    ),
    // Un-link transactions from the deleted unit (but keep them on the property)
    transactions: state.transactions.map(t => 
      t.linkedUnitId === unitId ? { ...t, linkedUnitId: undefined } : t
    )
  })),

  // ── Transactions ────────────────────────────────────────
  addTransaction: (transaction) => set((state) => ({
    transactions: [...state.transactions, transaction]
  })),

  deleteTransaction: (transactionId) => set((state) => ({
    transactions: state.transactions.filter(t => t.id !== transactionId)
  }))
}));
