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
  clearStore: () => void;
}

export const usePropertyStore = create<PropertyState>((set) => ({
  properties: [],
  transactions: [],
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
  })),

  clearStore: () => set({
    properties: [],
    transactions: [],
    isLoading: false,
    error: null,
  })
}));
