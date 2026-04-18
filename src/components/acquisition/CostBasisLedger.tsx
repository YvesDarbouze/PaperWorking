'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  DollarSign,
  Landmark,
  Receipt,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Circle,
  Plus,
  Trash2,
} from 'lucide-react';
import type { CostBasisLineItem, CostBasisLedger as CostBasisLedgerType } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Cost Basis Ledger — Phase 2 (Acquisition & Due Diligence)
   3-part capitalization table tracking all deal costs:
     1. Direct Acquisition Costs
     2. Financing Costs
     3. Pre-Closing Costs
   ═══════════════════════════════════════════════════════ */

// ── Default line items per section ──────────────────────
const DEFAULT_DIRECT: CostBasisLineItem[] = [
  { id: 'da-1', label: 'Purchase Price', amount: 0, paid: false, notes: '' },
  { id: 'da-2', label: 'Title Insurance', amount: 0, paid: false, notes: '' },
  { id: 'da-3', label: 'Legal Fees', amount: 0, paid: false, notes: '' },
  { id: 'da-4', label: 'Recording Taxes / Transfer Tax', amount: 0, paid: false, notes: '' },
  { id: 'da-5', label: 'Utility Setup', amount: 0, paid: false, notes: '' },
];

const DEFAULT_FINANCING: CostBasisLineItem[] = [
  { id: 'fn-1', label: 'Loan Origination Fee', amount: 0, paid: false, notes: '' },
  { id: 'fn-2', label: 'Points', amount: 0, paid: false, notes: '' },
  { id: 'fn-3', label: 'Appraisal Fee', amount: 0, paid: false, notes: '' },
  { id: 'fn-4', label: 'Mortgage Insurance', amount: 0, paid: false, notes: '' },
];

const DEFAULT_PRECLOSING: CostBasisLineItem[] = [
  { id: 'pc-1', label: 'Due Diligence (Inspections)', amount: 0, paid: false, notes: '' },
  { id: 'pc-2', label: 'Environmental Assessment', amount: 0, paid: false, notes: '' },
  { id: 'pc-3', label: 'Prepaid Taxes', amount: 0, paid: false, notes: '' },
  { id: 'pc-4', label: 'Prepaid Interest', amount: 0, paid: false, notes: '' },
];

type SectionKey = 'directAcquisition' | 'financing' | 'preClosing';

interface SectionMeta {
  key: SectionKey;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const SECTIONS: SectionMeta[] = [
  {
    key: 'directAcquisition',
    title: 'Direct Acquisition Costs',
    icon: <Landmark className="w-4 h-4" />,
    color: 'text-gray-800',
    bgColor: 'bg-pw-muted/10',
  },
  {
    key: 'financing',
    title: 'Financing Costs',
    icon: <DollarSign className="w-4 h-4" />,
    color: 'text-gray-800',
    bgColor: 'bg-pw-muted/15',
  },
  {
    key: 'preClosing',
    title: 'Pre-Closing Costs',
    icon: <Receipt className="w-4 h-4" />,
    color: 'text-gray-800',
    bgColor: 'bg-pw-muted/20',
  },
];

function buildDefaultLedger(): CostBasisLedgerType {
  return {
    directAcquisition: DEFAULT_DIRECT.map(d => ({ ...d })),
    financing: DEFAULT_FINANCING.map(d => ({ ...d })),
    preClosing: DEFAULT_PRECLOSING.map(d => ({ ...d })),
  };
}

export default function CostBasisLedger() {
  const currentProject = useProjectStore(s => s.currentProject);
  const updateCostBasis = useProjectStore(s => s.updateCostBasis);

  const [ledger, setLedger] = useState<CostBasisLedgerType>(() =>
    currentProject?.costBasisLedger ?? buildDefaultLedger()
  );
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    directAcquisition: true,
    financing: true,
    preClosing: true,
  });

  // Persist to store on every change
  const persist = useCallback(
    (next: CostBasisLedgerType) => {
      setLedger(next);
      if (currentProject) updateCostBasis(currentProject.id, next);
    },
    [currentProject, updateCostBasis]
  );

  // ── Mutation helpers ──────────────────────────
  const updateItem = (section: SectionKey, id: string, field: keyof CostBasisLineItem, value: unknown) => {
    const next: CostBasisLedgerType = {
      ...ledger,
      [section]: ledger[section].map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    };
    persist(next);
  };

  const togglePaid = (section: SectionKey, id: string) => {
    const next: CostBasisLedgerType = {
      ...ledger,
      [section]: ledger[section].map(item =>
        item.id === id ? { ...item, paid: !item.paid, paidAt: !item.paid ? new Date() : undefined } : item
      ),
    };
    persist(next);
  };

  const addItem = (section: SectionKey) => {
    const newItem: CostBasisLineItem = {
      id: `${section.slice(0, 2)}-${Date.now()}`,
      label: '',
      amount: 0,
      paid: false,
      notes: '',
    };
    persist({ ...ledger, [section]: [...ledger[section], newItem] });
  };

  const removeItem = (section: SectionKey, id: string) => {
    persist({ ...ledger, [section]: ledger[section].filter(i => i.id !== id) });
  };

  // ── Derived metrics ───────────────────────────
  const totals = useMemo(() => {
    const calc = (items: CostBasisLineItem[]) => ({
      total: items.reduce((s, i) => s + i.amount, 0),
      paid: items.filter(i => i.paid).reduce((s, i) => s + i.amount, 0),
      count: items.length,
      paidCount: items.filter(i => i.paid).length,
    });
    const da = calc(ledger.directAcquisition);
    const fn = calc(ledger.financing);
    const pc = calc(ledger.preClosing);
    return {
      sections: { directAcquisition: da, financing: fn, preClosing: pc },
      grandTotal: da.total + fn.total + pc.total,
      grandPaid: da.paid + fn.paid + pc.paid,
    };
  }, [ledger]);

  const toggleSection = (key: SectionKey) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium tracking-tight text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-pw-muted" />
              Cost Basis Ledger
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Track all capital costs for {currentProject?.propertyName ?? 'this deal'}
            </p>
          </div>
        </div>

        {/* Summary badges */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs uppercase tracking-widest text-gray-400">Total Basis</p>
            <p className="text-xl font-light text-gray-900">${totals.grandTotal.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs uppercase tracking-widest text-gray-400">Paid</p>
            <p className="text-xl font-light text-green-700">${totals.grandPaid.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs uppercase tracking-widest text-gray-400">Outstanding</p>
            <p className="text-xl font-light text-amber-700">
              ${(totals.grandTotal - totals.grandPaid).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 3 Sections */}
      <div className="divide-y divide-gray-100">
        {SECTIONS.map(sec => {
          const items = ledger[sec.key];
          const st = totals.sections[sec.key];
          const isExpanded = expanded[sec.key];

          return (
            <div key={sec.key}>
              {/* Section header (collapsible) */}
              <button
                onClick={() => toggleSection(sec.key)}
                className={`w-full flex items-center justify-between px-6 py-3.5 ${sec.bgColor} hover:bg-gray-100 transition`}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  )}
                  <span className="text-gray-500">{sec.icon}</span>
                  <span className={`text-sm font-semibold ${sec.color}`}>{sec.title}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{st.paidCount}/{st.count} paid</span>
                  <span className="font-mono font-medium">${st.total.toLocaleString()}</span>
                </div>
              </button>

              {/* Line items */}
              {isExpanded && (
                <div className="px-6 pb-4 pt-2 space-y-2">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                        item.paid
                          ? 'bg-gray-50 border-gray-100 opacity-70'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Paid toggle */}
                      <button
                        onClick={() => togglePaid(sec.key, item.id)}
                        className={`flex-shrink-0 ${
                          item.paid ? 'text-green-500' : 'text-gray-300 hover:text-gray-500'
                        }`}
                        title={item.paid ? 'Mark unpaid' : 'Mark paid'}
                      >
                        {item.paid ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>

                      {/* Label (editable) */}
                      <input
                        type="text"
                        value={item.label}
                        onChange={e => updateItem(sec.key, item.id, 'label', e.target.value)}
                        placeholder="Line item description"
                        className={`flex-1 text-sm bg-transparent outline-none ${
                          item.paid ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}
                      />

                      {/* Amount (editable) */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          value={item.amount || ''}
                          onChange={e =>
                            updateItem(sec.key, item.id, 'amount', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          className="w-24 text-sm font-mono text-right bg-transparent outline-none text-gray-900"
                        />
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => removeItem(sec.key, item.id)}
                        className="text-gray-300 hover:text-red-500 transition flex-shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add item */}
                  <button
                    onClick={() => addItem(sec.key)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition"
                  >
                    <Plus className="w-3 h-3" /> Add Line Item
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
