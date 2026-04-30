'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectFinancials } from '@/types/schema';
import { DollarSign, Percent, Save } from 'lucide-react';
import {
  rentalSetupSchema,
  computeRentalMetrics,
  type RentalSetupInput,
} from '@/lib/validation/rentalSetupSchema';

interface RentalOperationsLedgerProps {
  financials: ProjectFinancials;
  totalAllInCost: number;
  onChange: (updated: Partial<ProjectFinancials>) => void;
  onSave: (derived?: Partial<ProjectFinancials>) => void;
  isSaving: boolean;
  isLocked?: boolean;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--text-warning, #B91C1C)' }}>
      {message}
    </p>
  );
}

export function RentalOperationsLedger({
  financials,
  totalAllInCost,
  onChange,
  onSave,
  isSaving,
  isLocked,
}: RentalOperationsLedgerProps) {
  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RentalSetupInput>({
    resolver: zodResolver(rentalSetupSchema),
    defaultValues: {
      projectedMonthlyRent:         financials.projectedMonthlyRent         ?? 0,
      vacancyRate:                  financials.vacancyRate                  ?? 5,
      maintenanceReserves:          financials.maintenanceReserves          ?? 0,
      propertyManagementFeePercent: financials.propertyManagementFeePercent ?? 0,
      longTermMortgagePayment:      financials.longTermMortgagePayment      ?? 0,
      financingCashInvested:        financials.financingCashInvested        ?? 0,
    },
    mode: 'onChange',
  });

  // Sync when the parent pushes new Firestore data (e.g. on first load)
  useEffect(() => {
    reset({
      projectedMonthlyRent:         financials.projectedMonthlyRent         ?? 0,
      vacancyRate:                  financials.vacancyRate                  ?? 5,
      maintenanceReserves:          financials.maintenanceReserves          ?? 0,
      propertyManagementFeePercent: financials.propertyManagementFeePercent ?? 0,
      longTermMortgagePayment:      financials.longTermMortgagePayment      ?? 0,
      financingCashInvested:        financials.financingCashInvested        ?? 0,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    financials.projectedMonthlyRent,
    financials.vacancyRate,
    financials.maintenanceReserves,
    financials.propertyManagementFeePercent,
    financials.longTermMortgagePayment,
    financials.financingCashInvested,
  ]);

  // Propagate only valid values upward
  useEffect(() => {
    const subscription = watch((values) => {
      const parsed = rentalSetupSchema.safeParse(values);
      if (parsed.success) {
        onChange({
          projectedMonthlyRent:         parsed.data.projectedMonthlyRent,
          vacancyRate:                  parsed.data.vacancyRate,
          maintenanceReserves:          parsed.data.maintenanceReserves,
          propertyManagementFeePercent: parsed.data.propertyManagementFeePercent,
          longTermMortgagePayment:      parsed.data.longTermMortgagePayment,
          financingCashInvested:        parsed.data.financingCashInvested,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  // Derive display metrics from live form values (safe fallback to 0 for invalid state)
  const watched = watch();
  const safeInput: RentalSetupInput = {
    projectedMonthlyRent:         watched.projectedMonthlyRent         || 0,
    vacancyRate:                  watched.vacancyRate                  ?? 0,
    maintenanceReserves:          watched.maintenanceReserves          ?? 0,
    propertyManagementFeePercent: watched.propertyManagementFeePercent ?? 0,
    longTermMortgagePayment:      watched.longTermMortgagePayment      ?? 0,
    financingCashInvested:        watched.financingCashInvested        ?? 0,
  };
  const m = computeRentalMetrics(safeInput, totalAllInCost);

  const onSubmit = (data: RentalSetupInput) => {
    const metrics = computeRentalMetrics(data, totalAllInCost);
    onSave({
      projectedMonthlyRent:         data.projectedMonthlyRent,
      vacancyRate:                  data.vacancyRate,
      maintenanceReserves:          data.maintenanceReserves,
      propertyManagementFeePercent: data.propertyManagementFeePercent,
      longTermMortgagePayment:      data.longTermMortgagePayment,
      financingCashInvested:        data.financingCashInvested,
      netOperatingIncome:           metrics.netOperatingIncome,
      netCashFlow:                  metrics.netCashFlow,
      capRate:                      metrics.capRate,
      cashOnCashReturn:             metrics.cashOnCashReturn,
    });
  };

  // ── Shared input class ──────────────────────────────────────
  const inputCls =
    'w-full bg-transparent text-sm py-2.5 rounded-[8px] focus:outline-none transition-all disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <section
        className="rounded-[8px] border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
      >
        {/* ── Header ── */}
        <div
          className="px-6 py-4 border-b flex justify-between items-center"
          style={{ borderColor: 'var(--border-ui)' }}
        >
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Rental Operations Tracker
            </h3>
            <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              BRRRR Stabilization &amp; Long-Term Yield
            </p>
          </div>
          {!isLocked && (
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all hover:shadow-sm"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-ui)',
              }}
            >
              {isSaving ? (
                <div
                  className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent' }}
                />
              ) : (
                <Save className="w-3 h-3" />
              )}
              {isSaving ? 'Finalizing' : 'Save Operations'}
            </button>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left Side: Inputs ── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Row 1: Gross Rent + Vacancy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly Gross Rent */}
              <div className="space-y-1">
                <label
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <DollarSign className="w-3 h-3" /> Monthly Gross Rent
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-xs font-medium text-[#A5A5A5]">$</span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    disabled={isLocked}
                    placeholder="2500"
                    {...register('projectedMonthlyRent', { valueAsNumber: true })}
                    className={`${inputCls} pl-7 pr-4`}
                    style={{
                      border: `1px solid ${errors.projectedMonthlyRent ? '#B91C1C' : 'var(--border-ui)'}`,
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <FieldError message={errors.projectedMonthlyRent?.message} />
              </div>

              {/* Vacancy Allowance */}
              <div className="space-y-1">
                <label
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Percent className="w-3 h-3" /> Vacancy Allowance
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    disabled={isLocked}
                    placeholder="5"
                    {...register('vacancyRate', { valueAsNumber: true })}
                    className={`${inputCls} px-4 pr-8 text-right`}
                    style={{
                      border: `1px solid ${errors.vacancyRate ? '#B91C1C' : 'var(--border-ui)'}`,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-xs font-medium text-[#A5A5A5]">%</span>
                  </div>
                </div>
                <FieldError message={errors.vacancyRate?.message} />
              </div>
            </div>

            {/* Row 2: Maintenance + Mgmt Fee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Maintenance Reserve */}
              <div className="space-y-1">
                <label
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <DollarSign className="w-3 h-3" /> Maintenance Reserve
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-xs font-medium text-[#A5A5A5]">$</span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    disabled={isLocked}
                    placeholder="200"
                    {...register('maintenanceReserves', { valueAsNumber: true })}
                    className={`${inputCls} pl-7 pr-4`}
                    style={{
                      border: `1px solid ${errors.maintenanceReserves ? '#B91C1C' : 'var(--border-ui)'}`,
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <FieldError message={errors.maintenanceReserves?.message} />
              </div>

              {/* Mgmt Fee */}
              <div className="space-y-1">
                <label
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Percent className="w-3 h-3" /> Mgmt Fee (%)
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    disabled={isLocked}
                    placeholder="8"
                    {...register('propertyManagementFeePercent', { valueAsNumber: true })}
                    className={`${inputCls} px-4 pr-8 text-right`}
                    style={{
                      border: `1px solid ${errors.propertyManagementFeePercent ? '#B91C1C' : 'var(--border-ui)'}`,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-xs font-medium text-[#A5A5A5]">%</span>
                  </div>
                </div>
                <FieldError message={errors.propertyManagementFeePercent?.message} />
              </div>
            </div>

            {/* Row 3: Debt Service + Cash Invested */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Debt Service */}
              <div className="space-y-1">
                <label
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <DollarSign className="w-3 h-3" /> Debt Service (PITI)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-xs font-medium text-[#A5A5A5]">$</span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    disabled={isLocked}
                    placeholder="0"
                    {...register('longTermMortgagePayment', { valueAsNumber: true })}
                    className={`${inputCls} pl-7 pr-4`}
                    style={{
                      border: `1px solid ${errors.longTermMortgagePayment ? '#B91C1C' : 'var(--border-ui)'}`,
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <FieldError message={errors.longTermMortgagePayment?.message} />
              </div>

              {/* Net Cash Invested */}
              <div className="space-y-1">
                <label
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <DollarSign className="w-3 h-3" /> Net Cash Invested
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-xs font-medium text-[#A5A5A5]">$</span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    disabled={isLocked}
                    placeholder={String(totalAllInCost)}
                    {...register('financingCashInvested', { valueAsNumber: true })}
                    className={`${inputCls} pl-7 pr-4`}
                    style={{
                      border: `1px solid ${errors.financingCashInvested ? '#B91C1C' : 'var(--border-ui)'}`,
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <FieldError message={errors.financingCashInvested?.message} />
              </div>
            </div>
          </div>

          {/* ── Right Side: Analytics ── */}
          <div
            className="lg:col-span-2 p-6 rounded-[8px] border flex flex-col justify-between space-y-6"
            style={{ backgroundColor: '#F9F9F9', borderColor: 'var(--border-ui)' }}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F] mb-1">Cap Rate</p>
                  <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                    {m.capRate.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F] mb-1">Cash on Cash</p>
                  <p
                    className="text-xl font-black"
                    style={{ color: m.cashOnCashReturn > 10 ? '#15803D' : 'var(--text-primary)' }}
                  >
                    {m.cashOnCashReturn.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="h-px bg-[#E5E5E5] w-full" />

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F] mb-1">Monthly NOI</p>
                  <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                    ${m.netOperatingIncome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#7F7F7F] mb-1">Total Yield</p>
                  <p className="text-sm font-bold" style={{ color: '#595959' }}>
                    ${m.annualNOI.toLocaleString()}{' '}
                    <span className="text-[10px] font-normal">/yr</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t" style={{ borderColor: '#E5E5E5' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7F7F7F] mb-2">
                Monthly Net Cash Flow
              </p>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl font-black tracking-tight ${
                    m.netCashFlow >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                  }`}
                >
                  ${m.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-sm font-medium text-[#A5A5A5]">/mo</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    m.netCashFlow >= 0 ? 'bg-[#15803D]' : 'bg-[#B91C1C]'
                  }`}
                />
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {m.netCashFlow >= 0 ? 'Positive Cash Flow Stabilized' : 'Operational Deficit Detected'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}
