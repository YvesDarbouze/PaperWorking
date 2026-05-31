'use client';

/**
 * DealHealthPreview — Wizard Review Step Enhancement (Component 9)
 *
 * Renders a live "Deal Health" preview during the review step of project creation.
 * Computes NOI, Cash Flow, and Cap Rate from the wizard form data and displays
 * health indicators so the investor can validate the deal before confirming.
 *
 * Formulas (CCIM/NARPM Standard):
 *   NOI = (Gross Rental Income + Other Income) − (Vacancy Loss + Operating Expenses)
 *   Cash Flow = NOI − Annual Debt Service
 *   Cap Rate = (NOI / Purchase Price) × 100
 */

import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Percent,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
} from 'lucide-react';

interface DealHealthPreviewProps {
  formData: {
    strategyType: string;
    financials: {
      grossMonthlyRent?: string;
      otherMonthlyIncome?: string;
      vacancyRatePercent?: string;
      holdingCostTaxes?: string;
      holdingCostInsurance?: string;
      holdingCostUtilities?: string;
      propertyManagementFeePercent?: string;
      monthlyMaintenanceReserve?: string;
      monthlyHOA?: string;
      projectedRent?: string;
      projectedOpex?: string;
      purchasePrice?: string;
      targetPrice?: string;
      loanAmount?: string;
      loanInterestRate?: string;
      loanTermYears?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

// ── Health Score Determination ──
function getHealthScore(
  noi: number,
  cashFlow: number,
  capRate: number
): { label: string; color: string; icon: React.ReactNode } {
  if (noi <= 0 || cashFlow < -500) {
    return {
      label: 'Needs Review',
      color: '#ffb4ab',
      icon: <AlertTriangle className="w-4 h-4" />,
    };
  }
  if (capRate >= 6 && cashFlow > 200) {
    return {
      label: 'Strong Deal',
      color: '#57f1db',
      icon: <CheckCircle2 className="w-4 h-4" />,
    };
  }
  if (capRate >= 4 && cashFlow >= 0) {
    return {
      label: 'Moderate',
      color: '#ffb875',
      icon: <MinusCircle className="w-4 h-4" />,
    };
  }
  return {
    label: 'Marginal',
    color: '#ffb875',
    icon: <AlertTriangle className="w-4 h-4" />,
  };
}

export function DealHealthPreview({ formData }: DealHealthPreviewProps) {
  const metrics = useMemo(() => {
    const f = formData.financials;
    const strategy = formData.strategyType;

    // Parse financial inputs
    const grossMonthlyRent = parseFloat(f.grossMonthlyRent || f.projectedRent || '0') || 0;
    const otherMonthlyIncome = parseFloat(f.otherMonthlyIncome || '0') || 0;
    const vacancyRate = parseFloat(f.vacancyRatePercent || '7') / 100; // default 7%
    const taxes = parseFloat(f.holdingCostTaxes || '0') || 0;
    const insurance = parseFloat(f.holdingCostInsurance || '0') || 0;
    const utilities = parseFloat(f.holdingCostUtilities || '0') || 0;
    const mgmtFeePercent = parseFloat(f.propertyManagementFeePercent || '0') / 100;
    const maintenance = parseFloat(f.monthlyMaintenanceReserve || '0') || 0;
    const hoa = parseFloat(f.monthlyHOA || '0') || 0;

    // Only show preview for Rent/BRRRR with rent data
    const isRentalStrategy = strategy === 'Rent' || strategy === 'BRRRR';
    if (!isRentalStrategy || grossMonthlyRent <= 0) {
      return null;
    }

    // Annual income
    const annualGrossRent = grossMonthlyRent * 12;
    const annualOtherIncome = otherMonthlyIncome * 12;
    const annualVacancyLoss = annualGrossRent * vacancyRate;

    // Annual expenses
    const annualMgmt = annualGrossRent * mgmtFeePercent;
    const monthlyOpex = taxes + insurance + utilities + maintenance + hoa;
    const annualOpex = monthlyOpex * 12 + annualMgmt;

    // If no granular data, fall back to projectedOpex
    const useFallback = monthlyOpex === 0 && annualMgmt === 0 && f.projectedOpex;
    const finalAnnualOpex = useFallback
      ? (parseFloat(f.projectedOpex!) || 0) * 12
      : annualOpex;

    // NOI
    const noi = annualGrossRent + annualOtherIncome - annualVacancyLoss - finalAnnualOpex;

    // Debt Service
    const loanAmount = parseFloat(f.loanAmount || '0') || 0;
    const rate = parseFloat(f.loanInterestRate || '0') || 0;
    const termYears = parseFloat(f.loanTermYears || '0') || 0;
    let annualDebtService = 0;
    if (loanAmount > 0 && rate > 0 && termYears > 0) {
      const r = rate / 100 / 12;
      const n = termYears * 12;
      const pow = Math.pow(1 + r, n);
      annualDebtService = loanAmount * (r * pow) / (pow - 1) * 12;
    }

    // Cash Flow
    const annualCashFlow = noi - annualDebtService;
    const monthlyCashFlow = annualCashFlow / 12;

    // Cap Rate
    const purchasePrice = parseFloat(f.purchasePrice || f.targetPrice || '0') || 0;
    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;

    return {
      noi,
      annualCashFlow,
      monthlyCashFlow,
      capRate,
      purchasePrice,
      hasDebtService: annualDebtService > 0,
      annualDebtService,
    };
  }, [formData]);

  // Don't render if insufficient data
  if (!metrics) return null;

  const health = getHealthScore(
    metrics.noi,
    metrics.monthlyCashFlow,
    metrics.capRate
  );

  return (
    <div className="mt-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-5 h-5 text-[#57f1db]" />
        <h3 className="text-[14px] font-semibold tracking-widest text-[#57f1db] uppercase">
          Deal Health Preview
        </h3>
      </div>

      {/* Health Status Bar */}
      <div
        className="rounded-xl p-4 mb-4 flex items-center gap-3 border"
        style={{
          backgroundColor: `${health.color}10`,
          borderColor: `${health.color}30`,
        }}
      >
        <span style={{ color: health.color }}>{health.icon}</span>
        <span
          className="text-[14px] font-semibold tracking-wide"
          style={{ color: health.color }}
        >
          {health.label}
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* NOI Card */}
        <MetricCard
          label="NOI"
          value={`$${Math.round(metrics.noi).toLocaleString()}`}
          sublabel="/yr"
          icon={<DollarSign className="w-4 h-4" />}
          isPositive={metrics.noi > 0}
        />

        {/* Cash Flow Card */}
        {metrics.hasDebtService && (
          <MetricCard
            label="Cash Flow"
            value={`$${Math.round(metrics.monthlyCashFlow).toLocaleString()}`}
            sublabel="/mo"
            icon={
              metrics.monthlyCashFlow >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )
            }
            isPositive={metrics.monthlyCashFlow >= 0}
          />
        )}

        {/* Cap Rate Card */}
        {metrics.purchasePrice > 0 && (
          <MetricCard
            label="Cap Rate"
            value={`${metrics.capRate.toFixed(1)}%`}
            sublabel=""
            icon={<Percent className="w-4 h-4" />}
            isPositive={metrics.capRate >= 4}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-component: Metric card ──
function MetricCard({
  label,
  value,
  sublabel,
  icon,
  isPositive,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  isPositive: boolean;
}) {
  const accent = isPositive ? '#57f1db' : '#ffb4ab';

  return (
    <div
      className="rounded-xl p-4 border border-white/10 transition-all duration-300"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: accent }}>{icon}</span>
        <span className="text-[11px] font-medium tracking-widest text-[#bacac5] uppercase">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-[22px] font-bold font-mono leading-none"
          style={{ color: accent }}
        >
          {value}
        </span>
        {sublabel && (
          <span className="text-[12px] text-[#bacac5] font-medium">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
