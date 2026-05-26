'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePropertyMetricSnapshots } from '@/hooks/usePropertyMetricSnapshots';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { MetricChart } from '@/components/metrics/MetricChart';
import { 
  auditTaxFields,
  calculateProjectTaxReport,
  aggregatePortfolioTaxReport,
  TaxPLResult
} from '@/lib/utils/taxService';

const METRICS_CONFIG = [
  { key: 'noi', label: 'NOI', unit: 'currency' as const, desc: 'Net Operating Income' },
  { key: 'cashFlow', label: 'Cash Flow', unit: 'currency' as const, desc: 'Net cash flow (monthly or annual)' },
  { key: 'capRate', label: 'Cap Rate', unit: '%' as const, desc: 'Capitalization Rate (NOI ÷ Price)' },
  { key: 'cashOnCashReturn', label: 'CoC Return', unit: '%' as const, desc: 'Cash-on-Cash Return' },
  { key: 'dscr', label: 'DSCR', unit: 'ratio' as const, desc: 'Debt Service Coverage Ratio' },
  { key: 'ltv', label: 'LTV', unit: '%' as const, desc: 'Loan-to-Value Ratio' },
  { key: 'occupancyRate', label: 'Occupancy', unit: '%' as const, desc: 'Days Occupied ÷ Total Days' },
  { key: 'oer', label: 'Expense Ratio', unit: '%' as const, desc: 'Operating Expense Ratio (Opex ÷ Gross Rent)' },
  { key: 'grossRentMultiplier', label: 'GRM', unit: '×' as const, desc: 'Gross Rent Multiplier' },
  { key: 'irr', label: 'IRR', unit: '%' as const, desc: 'Projected Internal Rate of Return' },
  { key: 'appreciation', label: 'Appreciation', unit: '%' as const, desc: 'Annualized CAGR Appreciation Rate' }
];

const formatValue = (val: number | null | undefined, unit: '%' | 'currency' | 'ratio' | '×'): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  switch (unit) {
    case '%':
      return `${val.toFixed(2)}%`;
    case 'currency': {
      const sign = val < 0 ? '-' : '';
      const abs = Math.abs(val);
      return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    case 'ratio':
      return val.toFixed(2);
    case '×':
      return `${val.toFixed(2)}x`;
    default:
      return String(val);
  }
};

function formatPeriodLabel(period: string, periodType: string): string {
  if (periodType === 'yearly' || periodType === 'annual') {
    return period;
  }
  if (periodType === 'quarterly') {
    if (period.includes('-Q')) {
      const [yr, qtr] = period.split('-Q');
      return `Q${qtr} ${yr}`;
    }
    return period;
  }
  try {
    const parts = period.split('-');
    if (parts.length === 2) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      }
    }
  } catch (_) {}
  return period;
}

const getMetricValue = (snapshot: any, key: string, periodType: string): number | null => {
  if (key === 'cashFlow') {
    return (periodType === 'yearly' || periodType === 'annual')
      ? snapshot.annualCashFlow
      : snapshot.monthlyCashFlow;
  }
  return snapshot[key];
};

export default function ReportsPage() {
  useAllDealsSync();
  const { profile } = useAuth();
  const projects = useProjectStore((state) => state.projects);

  const [reportsTab, setReportsTab] = useState<'performance' | 'tax'>('performance');
  const [scope, setScope] = useState<'portfolio' | 'project'>('portfolio');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'yearly' | 'overall'>('monthly');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('noi');

  // Tax States
  const [taxYear, setTaxYear] = useState<string>('2026');
  const [taxPeriod, setTaxPeriod] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Annual' | 'Overall'>('Annual');

  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Map API period type
  const apiPeriodType = useMemo(() => {
    if (periodType === 'overall') return 'monthly';
    if (periodType === 'yearly') return 'annual';
    return periodType;
  }, [periodType]);

  // Query project or portfolio snapshots
  const { snapshots: projectSnapshots, loading: projectLoading } = usePropertyMetricSnapshots(
    scope === 'project' ? selectedProjectId : undefined,
    apiPeriodType
  );

  const { snapshots: portfolioSnapshots, loading: portfolioLoading } = usePortfolioMetricSnapshots(
    scope === 'portfolio' ? apiPeriodType : undefined
  );

  const rawSnapshots = scope === 'portfolio' ? portfolioSnapshots : projectSnapshots;
  const loading = scope === 'portfolio' ? portfolioLoading : projectLoading;

  // Filter chronologically and bound by user input dates
  const filteredSnapshots = useMemo(() => {
    let result = [...(rawSnapshots || [])];
    if (startDate) {
      const start = new Date(startDate + '-01T00:00:00');
      result = result.filter(s => new Date(s.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate + '-01T23:59:59');
      // Set to last day of selected month
      end.setMonth(end.getMonth() + 1);
      result = result.filter(s => new Date(s.date) < end);
    }
    return result;
  }, [rawSnapshots, startDate, endDate]);

  const activeMetricConfig = useMemo(() => {
    return METRICS_CONFIG.find(m => m.key === selectedMetric) || METRICS_CONFIG[0];
  }, [selectedMetric]);

  const chartSeries = useMemo(() => {
    return filteredSnapshots.map(s => ({
      date: s.date,
      value: getMetricValue(s, selectedMetric, apiPeriodType)
    }));
  }, [filteredSnapshots, selectedMetric, apiPeriodType]);

  const latestSnapshot = useMemo(() => {
    if (filteredSnapshots.length === 0) return null;
    return filteredSnapshots[filteredSnapshots.length - 1];
  }, [filteredSnapshots]);

  // Auto-select first project if none chosen
  useEffect(() => {
    if (scope === 'project' && !selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [scope, selectedProjectId, projects]);

  // Tax calculations
  const taxDateRange = useMemo(() => {
    const yearNum = parseInt(taxYear, 10);
    let start: Date;
    let end: Date;

    if (taxPeriod === 'Overall') {
      start = new Date(2000, 0, 1);
      end = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (taxPeriod === 'Annual') {
      start = new Date(yearNum, 0, 1);
      end = new Date(yearNum, 11, 31, 23, 59, 59, 999);
    } else {
      const qtr = parseInt(taxPeriod.replace('Q', ''), 10);
      const startMonth = (qtr - 1) * 3;
      start = new Date(yearNum, startMonth, 1);
      end = new Date(yearNum, startMonth + 3, 0, 23, 59, 59, 999);
    }
    return { start, end };
  }, [taxYear, taxPeriod]);

  const taxReportData = useMemo(() => {
    if (reportsTab !== 'tax' || projects.length === 0) {
      return { report: null, missingFields: [] as string[], activeReports: [] as TaxPLResult[] };
    }

    if (scope === 'project') {
      if (!selectedProject) {
        return { report: null, missingFields: [] as string[], activeReports: [] as TaxPLResult[] };
      }
      const report = calculateProjectTaxReport(selectedProject, taxDateRange.start, taxDateRange.end);
      const missingFields = auditTaxFields(selectedProject);
      return { report, missingFields, activeReports: [report] };
    } else {
      // Portfolio
      const activeReports = projects
        .map(p => calculateProjectTaxReport(p, taxDateRange.start, taxDateRange.end))
        .filter(r => r.activeMonths > 0);
      
      const aggregated = aggregatePortfolioTaxReport(activeReports) as any;
      
      const report: TaxPLResult = {
        ...aggregated,
        projectId: 'portfolio',
        propertyName: 'Portfolio Total',
        isSoldInPeriod: activeReports.some(r => r.isSoldInPeriod)
      };

      const missingFields = projects.flatMap(p => {
        const fields = auditTaxFields(p);
        return fields.map(f => `${p.propertyName}: ${f}`);
      });

      return { report, missingFields, activeReports };
    }
  }, [reportsTab, projects, scope, selectedProject, taxDateRange]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredSnapshots.length === 0) return;

    const headers = [
      'Period',
      'Net Operating Income (NOI)',
      'Net Cash Flow',
      'Cap Rate (%)',
      'Cash-on-Cash Return (%)',
      'DSCR',
      'Occupancy Rate (%)',
      'Operating Expense Ratio (%)',
      'Gross Rent Multiplier',
      'IRR (%)',
      'Appreciation (%)'
    ];

    const rows = filteredSnapshots.map(s => [
      s.period,
      getMetricValue(s, 'noi', apiPeriodType),
      getMetricValue(s, 'cashFlow', apiPeriodType),
      getMetricValue(s, 'capRate', apiPeriodType),
      getMetricValue(s, 'cashOnCashReturn', apiPeriodType),
      getMetricValue(s, 'dscr', apiPeriodType),
      getMetricValue(s, 'occupancyRate', apiPeriodType),
      getMetricValue(s, 'oer', apiPeriodType),
      getMetricValue(s, 'grossRentMultiplier', apiPeriodType),
      getMetricValue(s, 'irr', apiPeriodType),
      getMetricValue(s, 'appreciation', apiPeriodType)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        if (val === null || val === undefined) return '';
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const scopeName = scope === 'portfolio' ? 'portfolio' : (selectedProject?.propertyName || 'deal').toLowerCase().replace(/\s+/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `performance_report_${scopeName}_${periodType}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export
  const handleExportPDF = () => {
    if (filteredSnapshots.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const scopeTitle = scope === 'portfolio' ? 'Whole Portfolio' : (selectedProject?.propertyName || 'Selected Deal');

    printWindow.document.write(`
      <html>
        <head>
          <title>Performance Report - ${scopeTitle}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              padding: 40px; 
              color: #0d0d0d; 
              background: #ffffff;
            }
            h1 { font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
            h2 { font-size: 11px; font-weight: 700; color: #595959; margin: 5px 0 30px 0; text-transform: uppercase; letter-spacing: 1px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; font-family: monospace; }
            th { 
              background: #f2f2f2; 
              text-align: left; 
              padding: 10px 8px; 
              font-weight: 800; 
              border-bottom: 2px solid #0d0d0d; 
              text-transform: uppercase; 
              letter-spacing: 0.5px;
              color: #595959;
            }
            td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; }
            .header-bar { display: flex; justify-content: space-between; border-bottom: 2px solid #0d0d0d; padding-bottom: 15px; }
            .footer { margin-top: 50px; font-size: 8px; color: #7f7f7f; border-top: 1px solid #e5e7eb; padding-top: 10px; text-align: right; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            @media print {
              body { padding: 0; }
              @page { size: landscape; margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <h1>Performance Snapshot Report</h1>
              <h2>Scope: ${scopeTitle} &bull; Period: ${periodType.toUpperCase()}</h2>
            </div>
            <div style="text-align: right">
              <p style="font-size: 10px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 1.5px;">PaperWorking</p>
              <p style="font-size: 8px; color: #7f7f7f; margin: 5px 0 0 0;">Generated: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>NOI</th>
                <th>Cash Flow</th>
                <th>Cap Rate</th>
                <th>CoC</th>
                <th>DSCR</th>
                <th>Occupancy</th>
                <th>OER</th>
                <th>GRM</th>
                <th>IRR</th>
                <th>Appreciation</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSnapshots.map(s => `
                <tr>
                  <td style="font-weight: bold;">${formatPeriodLabel(s.period, apiPeriodType)}</td>
                  <td>${formatValue(getMetricValue(s, 'noi', apiPeriodType), 'currency')}</td>
                  <td>${formatValue(getMetricValue(s, 'cashFlow', apiPeriodType), 'currency')}</td>
                  <td>${formatValue(getMetricValue(s, 'capRate', apiPeriodType), '%')}</td>
                  <td>${formatValue(getMetricValue(s, 'cashOnCashReturn', apiPeriodType), '%')}</td>
                  <td>${formatValue(getMetricValue(s, 'dscr', apiPeriodType), 'ratio')}</td>
                  <td>${formatValue(getMetricValue(s, 'occupancyRate', apiPeriodType), '%')}</td>
                  <td>${formatValue(getMetricValue(s, 'oer', apiPeriodType), '%')}</td>
                  <td>${formatValue(getMetricValue(s, 'grossRentMultiplier', apiPeriodType), '×')}</td>
                  <td>${formatValue(getMetricValue(s, 'irr', apiPeriodType), '%')}</td>
                  <td>${formatValue(getMetricValue(s, 'appreciation', apiPeriodType), '%')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Confidential Performance Data &bull; PaperWorking Portfolio Intelligence
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Tax CSV Export
  const handleExportTaxCSV = () => {
    const data = taxReportData;
    if (!data || !data.report) return;

    const report = data.report;
    const scopeTitle = scope === 'portfolio' ? 'Whole Portfolio' : (selectedProject?.propertyName || 'Selected Project');

    const headers = ['Category', 'Line Item', 'Amount'];
    const rows = [
      ['INCOME', 'Rental Income', report.rentalIncome],
      ['INCOME', 'Other Income', report.otherIncome],
      ['INCOME', 'Sale Proceeds (Realized)', report.saleProceeds],
      ['INCOME', 'Total Gross Income', report.totalGrossIncome],
      ['', '', ''],
      ['DEDUCTIBLE OPERATING EXPENSES', 'Property Taxes', report.propertyTaxes],
      ['DEDUCTIBLE OPERATING EXPENSES', 'Insurance', report.insurance],
      ['DEDUCTIBLE OPERATING EXPENSES', 'Utilities', report.utilities],
      ['DEDUCTIBLE OPERATING EXPENSES', 'Property Management', report.propertyManagement],
      ['DEDUCTIBLE OPERATING EXPENSES', 'Repairs & Maintenance', report.repairsMaintenance],
      ['DEDUCTIBLE OPERATING EXPENSES', 'HOA Fees', report.hoaFees],
      ['DEDUCTIBLE OPERATING EXPENSES', 'Mortgage Interest (Amortized)', report.mortgageInterest],
      ['DEDUCTIBLE OPERATING EXPENSES', 'Total Deductible Expenses', report.totalDeductibleExpenses],
      ['', '', ''],
      ['NET TAX RESULTS', 'Net Operating Result (Income - Opex)', report.netOperatingResult],
      ['NET TAX RESULTS', 'Net Taxable Operating Result (Net Operating - Interest)', report.netTaxableResult],
      ['', '', ''],
      ['CAPITALIZED ITEMS (NON-EXPENSED)', 'Mortgage Principal Paydown', report.mortgagePrincipal],
      ['CAPITALIZED ITEMS (NON-EXPENSED)', 'Capital Rehab / Improvements', report.capitalizedRehab],
      ['', '', ''],
      ['DEPRECIATION', 'Straight-Line Depreciation Estimate (27.5-Yr)', report.depreciationEstimate],
      ['', '', '']
    ];

    if (report.isSoldInPeriod) {
      rows.push(
        ['EXIT / DISPOSITION RECONCILIATION', 'Actual Sale Price', report.saleProceeds],
        ['EXIT / DISPOSITION RECONCILIATION', 'Acquisition Basis (Purchase + Closing)', report.acquisitionBasis],
        ['EXIT / DISPOSITION RECONCILIATION', 'Lifetime Capitalized Rehab', report.lifetimeCapitalizedRehab],
        ['EXIT / DISPOSITION RECONCILIATION', 'Selling Costs (Commissions + Exit Closing)', report.sellingCosts],
        ['EXIT / DISPOSITION RECONCILIATION', 'Realized Gain/Loss on Sale', report.realizedGainLoss]
      );
    }

    const csvContent = [
      [`"PaperWorking CPA Export Ledger"`, `""`, `""`],
      [`"Scope: ${scopeTitle.replace(/"/g, '""')}"`, `""`, `""`],
      [`"Period: ${taxPeriod} ${taxYear}"`, `""`, `""`],
      [`"Generated: ${new Date().toLocaleDateString()}"`, `""`, `""`],
      [],
      headers.join(','),
      ...rows.map(row => row.map(val => {
        if (val === null || val === undefined) return '';
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const scopeName = scope === 'portfolio' ? 'portfolio' : (selectedProject?.propertyName || 'deal').toLowerCase().replace(/\s+/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `cpa_tax_report_${scopeName}_${taxPeriod}_${taxYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tax PDF Export
  const handleExportTaxPDF = () => {
    const data = taxReportData;
    if (!data || !data.report) return;

    const report = data.report;
    const scopeTitle = scope === 'portfolio' ? 'Whole Portfolio' : (selectedProject?.propertyName || 'Selected Project');
    const periodLabel = taxPeriod === 'Overall' ? 'Overall Hold Period' : `${taxPeriod} ${taxYear}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fmt = (val: number) => formatValue(val, 'currency');

    printWindow.document.write(`
      <html>
        <head>
          <title>CPA Tax Export - ${scopeTitle}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              padding: 40px; 
              color: #0d0d0d; 
              background: #ffffff;
            }
            h1 { font-size: 18px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
            h2 { font-size: 11px; font-weight: 700; color: #595959; margin: 5px 0 25px 0; text-transform: uppercase; letter-spacing: 1px; }
            
            .disclaimer-box {
              border: 1px solid #d1d5db;
              background: #f9fafb;
              padding: 12px;
              font-size: 9px;
              line-height: 1.4;
              color: #4b5563;
              margin-bottom: 25px;
            }
            
            .ledger-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; font-family: monospace; }
            .ledger-table th { 
              background: #f2f2f2; 
              text-align: left; 
              padding: 8px 10px; 
              font-weight: 800; 
              border-bottom: 2px solid #0d0d0d; 
              text-transform: uppercase; 
              letter-spacing: 0.5px;
              color: #374151;
            }
            .ledger-table td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
            .section-row { background: #f9fafb; font-weight: bold; text-transform: uppercase; }
            .section-row td { border-bottom: 1.5px solid #0d0d0d; color: #1f2937; letter-spacing: 0.5px; font-size: 9px; }
            .total-row { font-weight: 800; }
            .total-row td { border-top: 1.5px solid #0d0d0d; border-bottom: 2px double #0d0d0d; }
            
            .header-bar { display: flex; justify-content: space-between; border-bottom: 2px solid #0d0d0d; padding-bottom: 15px; margin-bottom: 20px; }
            .footer { margin-top: 40px; font-size: 8px; color: #7f7f7f; border-top: 1px solid #e5e7eb; padding-top: 10px; text-align: right; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            @media print {
              body { padding: 0; }
              @page { size: portrait; margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <h1>CPA Tax Ledger Export</h1>
              <h2>Scope: ${scopeTitle} &bull; Period: ${periodLabel}</h2>
            </div>
            <div style="text-align: right">
              <p style="font-size: 10px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 1.5px;">PaperWorking</p>
              <p style="font-size: 8px; color: #7f7f7f; margin: 5px 0 0 0;">Generated: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <div class="disclaimer-box">
            <strong>TAX PROFESSIONAL DISCLAIMER:</strong> This ledger compiles historical transactions, rehab allocations, and mortgage amortization schedules directly from property record entries. Real estate investor vs. dealer classification, final Schedule E deduction allocations, and depreciable asset life options must be audited and finalized by a licensed CPA or tax professional. This output does not constitute formal tax advice or completed IRS filing forms.
          </div>
          
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Category / Line Item Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr class="section-row">
                <td colspan="2">Gross Rental & Other Income</td>
              </tr>
              <tr>
                <td>Rental Income (Allocated Hold Period)</td>
                <td style="text-align: right;">${fmt(report.rentalIncome)}</td>
              </tr>
              <tr>
                <td>Other Income (Laundry, Parking, etc.)</td>
                <td style="text-align: right;">${fmt(report.otherIncome)}</td>
              </tr>
              ${report.isSoldInPeriod ? `
              <tr>
                <td>Sale Proceeds (Gross Exit Value)</td>
                <td style="text-align: right;">${fmt(report.saleProceeds)}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td>Total Gross Income</td>
                <td style="text-align: right;">${fmt(report.totalGrossIncome)}</td>
              </tr>
              
              <tr class="section-row">
                <td colspan="2">Deductible Operating Expenses (Schedule E Aligned)</td>
              </tr>
              <tr>
                <td>Property Taxes</td>
                <td style="text-align: right;">${fmt(report.propertyTaxes)}</td>
              </tr>
              <tr>
                <td>Insurance</td>
                <td style="text-align: right;">${fmt(report.insurance)}</td>
              </tr>
              <tr>
                <td>Utilities</td>
                <td style="text-align: right;">${fmt(report.utilities)}</td>
              </tr>
              <tr>
                <td>Property Management Fees</td>
                <td style="text-align: right;">${fmt(report.propertyManagement)}</td>
              </tr>
              <tr>
                <td>Repairs & Maintenance</td>
                <td style="text-align: right;">${fmt(report.repairsMaintenance)}</td>
              </tr>
              <tr>
                <td>HOA Fees</td>
                <td style="text-align: right;">${fmt(report.hoaFees)}</td>
              </tr>
              <tr>
                <td>Mortgage Interest (Amortized Schedule)</td>
                <td style="text-align: right;">${fmt(report.mortgageInterest)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Deductible Operating Expenses</td>
                <td style="text-align: right;">${fmt(report.totalDeductibleExpenses)}</td>
              </tr>
              
              <tr class="section-row">
                <td colspan="2">Operating Summary</td>
              </tr>
              <tr>
                <td>Net Operating Result (Excl. Interest)</td>
                <td style="text-align: right;">${fmt(report.netOperatingResult)}</td>
              </tr>
              <tr class="total-row">
                <td>Net Taxable Operating Result</td>
                <td style="text-align: right;">${fmt(report.netTaxableResult)}</td>
              </tr>

              <tr class="section-row">
                <td colspan="2">Capitalized Balance Sheet Items (Non-Expensed)</td>
              </tr>
              <tr>
                <td>Mortgage Principal Paydown</td>
                <td style="text-align: right;">${fmt(report.mortgagePrincipal)}</td>
              </tr>
              <tr>
                <td>Approved Rehab / Capital Improvements</td>
                <td style="text-align: right;">${fmt(report.capitalizedRehab)}</td>
              </tr>
              
              <tr class="section-row">
                <td colspan="2">Depreciation Estimate</td>
              </tr>
              <tr>
                <td>Straight-Line Depreciation Estimate (27.5-Yr Standard)</td>
                <td style="text-align: right;">${fmt(report.depreciationEstimate)}</td>
              </tr>
              
              ${report.isSoldInPeriod ? `
              <tr class="section-row">
                <td colspan="2">Capital Gain / Exit Reconciliation</td>
              </tr>
              <tr>
                <td>Acquisition Basis (Purchase Price + Closing)</td>
                <td style="text-align: right;">${fmt(report.acquisitionBasis)}</td>
              </tr>
              <tr>
                <td>Lifetime Capitalized Rehab</td>
                <td style="text-align: right;">${fmt(report.lifetimeCapitalizedRehab)}</td>
              </tr>
              <tr>
                <td>Selling Costs (Commissions + Exit Fees)</td>
                <td style="text-align: right;">${fmt(report.sellingCosts)}</td>
              </tr>
              <tr class="total-row" style="color: ${report.realizedGainLoss >= 0 ? '#047857' : '#b91c1c'}">
                <td>Realized Capital Gain / Loss on Sale</td>
                <td style="text-align: right;">${fmt(report.realizedGainLoss)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
          
          <div class="footer">
            PaperWorking CPA Ledger System &bull; Confidential Financial Document
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isExportDisabled = useMemo(() => {
    if (reportsTab === 'performance') {
      return filteredSnapshots.length === 0;
    } else {
      if (!taxReportData.report) return true;
      if (scope === 'portfolio' && taxReportData.activeReports.length === 0) return true;
      if (scope === 'project' && taxReportData.report.activeMonths === 0) return true;
      return false;
    }
  }, [reportsTab, filteredSnapshots, taxReportData, scope]);

  return (
    <div className="max-w-7xl mx-auto mb-12 animate-in fade-in duration-700" style={{ color: 'var(--color-on-background, #dae4ec)' }}>
      
      {/* ── Header & Controls ── */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--color-on-background)' }}>
              Reports Command Center
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-on-surface-variant, #bacac5)' }}>
              Real-time performance analytics and fiscal intelligence.
            </p>
          </div>

          {/* Scope Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Segmented Control */}
            <div className="glass-card p-1 rounded-xl flex">
              {([
                { id: 'monthly' as const, label: 'Month' },
                { id: 'quarterly' as const, label: 'Quarter' },
                { id: 'yearly' as const, label: 'Year' },
                { id: 'overall' as const, label: 'Overall' }
              ]).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPeriodType(p.id);
                    setStartDate('');
                    setEndDate('');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    periodType === p.id
                      ? 'shadow-sm'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    background: periodType === p.id ? 'var(--color-primary-container, #2dd4bf)' : 'transparent',
                    color: periodType === p.id ? 'var(--color-on-primary-container, #00574d)' : 'var(--color-on-surface-variant, #bacac5)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Scope Dropdown */}
            <div className="relative group">
              <button
                className="glass-card px-4 py-2.5 rounded-xl flex items-center gap-3 min-w-[200px] justify-between transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg" style={{ color: 'var(--color-primary, #57f1db)' }}>domain</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }}>
                    {scope === 'portfolio' ? 'Whole Portfolio' : (selectedProject?.propertyName || 'Select Project')}
                  </span>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)' }}>expand_more</span>
              </button>
              {/* Scope Dropdown Menu */}
              <div className="hidden group-focus-within:block absolute top-full left-0 mt-1 glass-card rounded-xl py-1 z-20 min-w-full">
                <button
                  onClick={() => setScope('portfolio')}
                  className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-white/5 transition-colors"
                  style={{ color: scope === 'portfolio' ? 'var(--color-primary)' : 'var(--color-on-surface)' }}
                >
                  Whole Portfolio
                </button>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setScope('project'); setSelectedProjectId(p.id); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-white/5 transition-colors"
                    style={{ color: scope === 'project' && selectedProjectId === p.id ? 'var(--color-primary)' : 'var(--color-on-surface)' }}
                  >
                    {p.propertyName}
                  </button>
                ))}
              </div>
            </div>

            {/* Property / My-Share Toggle */}
            <div className="flex items-center gap-3 glass-card px-4 py-2 rounded-xl">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Property</span>
              <div className="w-10 h-5 rounded-full relative cursor-pointer" style={{ background: 'var(--color-surface-container-highest, #2d363d)' }}>
                <div className="absolute top-1 left-1 w-3 h-3 rounded-full transition-transform" style={{ background: 'var(--color-primary, #57f1db)' }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface)' }}>My-Share</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-tab Toggle (Performance / Tax) ── */}
      <div className="flex mb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => setReportsTab('performance')}
          className="px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all"
          style={{
            borderBottom: reportsTab === 'performance' ? '2px solid var(--color-primary, #57f1db)' : '2px solid transparent',
            color: reportsTab === 'performance' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
          }}
        >
          Performance Analytics
        </button>
        <button
          onClick={() => setReportsTab('tax')}
          className="px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all"
          style={{
            borderBottom: reportsTab === 'tax' ? '2px solid var(--color-primary, #57f1db)' : '2px solid transparent',
            color: reportsTab === 'tax' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
          }}
        >
          Tax Intelligence
        </button>
      </div>

      {reportsTab === 'performance' ? (
        // ── PERFORMANCE REPORTING TAB ──
        loading ? (
          <div className="h-96 flex items-center justify-center glass-card rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>Loading Snapshots...</span>
            </div>
          </div>
        ) : filteredSnapshots.length === 0 ? (
          <div className="glass-card rounded-2xl p-16 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-on-surface-variant)' }} />
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface)' }}>No Activity</h3>
            <p className="text-[10px] mt-1 max-w-sm mx-auto font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
              No real snapshot records exist for this period range. 
              PaperWorking renders &quot;no activity&quot; to safeguard reports from displaying deceptive zero-value entries.
            </p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── Core REI Metrics Bento Grid ── */}
            <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* NOI */}
              <button onClick={() => setSelectedMetric('noi')} className="glass-card p-4 rounded-xl flex flex-col justify-between h-32 text-left transition-all hover:border-white/20" style={{ borderLeft: '4px solid rgba(87,241,219,0.4)' }}>
                <div className="flex justify-between items-start w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1 w-fit" style={{ color: 'var(--color-primary)', background: 'rgba(87,241,219,0.1)' }}>LIVE</span>
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>NOI</p>
                  </div>
                  <span className="material-symbols-outlined text-lg" style={{ color: 'rgba(87,241,219,0.5)' }}>payments</span>
                </div>
                <div className="w-full">
                  <h3 className="text-xl font-bold leading-none" style={{ color: 'var(--color-on-background)' }}>
                    {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'noi', apiPeriodType) : null, 'currency')}
                  </h3>
                  <div className="mt-2 h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--color-surface-container-highest, #2d363d)' }}>
                    <div className="h-full rounded-full" style={{ width: '75%', background: 'var(--color-primary)' }} />
                  </div>
                </div>
              </button>

              {/* Cash Flow */}
              <button onClick={() => setSelectedMetric('cashFlow')} className="glass-card p-4 rounded-xl flex flex-col justify-between h-32 text-left transition-all hover:border-white/20" style={{ borderLeft: '4px solid rgba(87,241,219,0.4)' }}>
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1 w-fit" style={{ color: 'var(--color-primary)', background: 'rgba(87,241,219,0.1)' }}>LIVE</span>
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>Cash Flow</p>
                  </div>
                  <span className="material-symbols-outlined text-lg" style={{ color: 'rgba(87,241,219,0.5)' }}>account_balance</span>
                </div>
                <h3 className="text-xl font-bold leading-none" style={{ color: 'var(--color-on-background)' }}>
                  {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'cashFlow', apiPeriodType) : null, 'currency')}
                </h3>
              </button>

              {/* IRR */}
              <button onClick={() => setSelectedMetric('irr')} className="glass-card p-4 rounded-xl flex flex-col justify-between h-32 text-left transition-all hover:border-white/20" style={{ borderLeft: '4px solid rgba(87,241,219,0.4)' }}>
                <div className="flex justify-between items-start w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1 w-fit" style={{ color: 'var(--color-on-surface-variant)', background: 'var(--color-surface-container-highest)' }}>REALIZED</span>
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>IRR</p>
                  </div>
                  <span className="material-symbols-outlined text-lg" style={{ color: 'rgba(87,241,219,0.5)' }}>trending_up</span>
                </div>
                <div className="w-full">
                  <h3 className="text-xl font-bold leading-none" style={{ color: 'var(--color-on-background)' }}>
                    {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'irr', apiPeriodType) : null, '%')}
                  </h3>
                  <div className="mt-2 flex items-end gap-[1px] h-4 relative">
                    <div className="flex-1 rounded-sm" style={{ height: '40%', background: 'rgba(87,241,219,0.4)' }} />
                    <div className="flex-1 rounded-sm" style={{ height: '60%', background: 'rgba(87,241,219,0.5)' }} />
                    <div className="flex-1 rounded-sm" style={{ height: '80%', background: 'rgba(87,241,219,0.6)' }} />
                    <div className="flex-1 rounded-sm" style={{ height: '100%', background: 'var(--color-primary)' }} />
                  </div>
                </div>
              </button>

              {/* Cap Rate */}
              <button onClick={() => setSelectedMetric('capRate')} className="glass-card p-4 rounded-xl flex flex-col justify-between h-32 text-left transition-all hover:border-white/20" style={{ borderLeft: '4px solid rgba(133,148,144,0.4)' }}>
                <div className="flex justify-between items-start w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1 w-fit" style={{ color: 'var(--color-on-surface-variant)', background: 'var(--color-surface-container-highest)' }}>LIVE</span>
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>Cap Rate</p>
                  </div>
                  <span className="material-symbols-outlined text-lg" style={{ color: 'var(--color-on-surface-variant)' }}>percent</span>
                </div>
                <div className="w-full">
                  <h3 className="text-xl font-bold leading-none" style={{ color: 'var(--color-on-background)' }}>
                    {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'capRate', apiPeriodType) : null, '%')}
                  </h3>
                </div>
              </button>

              {/* Cash-on-Cash */}
              <button onClick={() => setSelectedMetric('cashOnCashReturn')} className="glass-card p-4 rounded-xl flex flex-col justify-between h-32 text-left transition-all hover:border-white/20" style={{ borderLeft: '4px solid rgba(87,241,219,0.4)' }}>
                <div className="flex justify-between items-start w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1 w-fit" style={{ color: 'var(--color-primary)', background: 'rgba(87,241,219,0.1)' }}>LIVE</span>
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>Cash-on-Cash</p>
                  </div>
                  <span className="material-symbols-outlined text-lg" style={{ color: 'rgba(87,241,219,0.5)' }}>account_balance_wallet</span>
                </div>
                <div className="w-full">
                  <h3 className="text-xl font-bold leading-none" style={{ color: 'var(--color-on-background)' }}>
                    {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'cashOnCashReturn', apiPeriodType) : null, '%')}
                  </h3>
                  <div className="flex items-center gap-1 mt-2" style={{ color: 'var(--color-primary)' }}>
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    <span className="text-[10px] font-bold">Stable yield</span>
                  </div>
                </div>
              </button>

              {/* LTV */}
              <button onClick={() => setSelectedMetric('ltv')} className="glass-card p-4 rounded-xl flex flex-col justify-between h-32 text-left transition-all hover:border-white/20" style={{ borderLeft: '4px solid rgba(255,180,171,0.4)' }}>
                <div className="flex flex-col">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-on-surface-variant)' }}>LTV</p>
                  <h3 className="text-xl font-bold leading-none" style={{ color: 'var(--color-on-background)' }}>
                    {formatValue(latestSnapshot ? (latestSnapshot as any).ltv : null, '%')}
                  </h3>
                </div>
                <div className="p-1.5 rounded flex items-center gap-1.5 w-fit" style={{ background: 'rgba(147,0,10,0.1)' }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-error, #ffb4ab)' }} />
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-error)' }}>Monitor</span>
                </div>
              </button>

              {/* DSCR */}
              <button onClick={() => setSelectedMetric('dscr')} className="glass-card p-5 rounded-2xl health-band-positive text-left transition-all hover:border-white/20">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-on-surface-variant)' }}>DSCR</p>
                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--color-on-background)' }}>
                  {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'dscr', apiPeriodType) : null, 'ratio')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-primary)' }}>Healthy Coverage</p>
              </button>

              {/* GRM */}
              <button onClick={() => setSelectedMetric('grossRentMultiplier')} className="glass-card p-5 rounded-2xl text-left transition-all hover:border-white/20">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-on-surface-variant)' }}>GRM</p>
                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--color-on-background)' }}>
                  {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'grossRentMultiplier', apiPeriodType) : null, '×')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Lower is better</p>
              </button>

              {/* OER */}
              <button onClick={() => setSelectedMetric('oer')} className="glass-card p-5 rounded-2xl text-left transition-all hover:border-white/20">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-on-surface-variant)' }}>OER</p>
                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--color-on-background)' }}>
                  {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'oer', apiPeriodType) : null, '%')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Op. Efficiency</p>
              </button>

              {/* Occupancy */}
              <button onClick={() => setSelectedMetric('occupancyRate')} className="glass-card p-5 rounded-2xl text-left transition-all hover:border-white/20">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-on-surface-variant)' }}>Occupancy</p>
                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--color-on-background)' }}>
                  {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'occupancyRate', apiPeriodType) : null, '%')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Days Occupied</p>
              </button>

              {/* Appreciation — wide card */}
              <button onClick={() => setSelectedMetric('appreciation')} className="glass-card p-4 rounded-xl col-span-1 md:col-span-2 flex flex-col justify-between text-left transition-all hover:border-white/20" style={{ borderLeft: '4px solid rgba(87,241,219,0.4)' }}>
                <div className="flex justify-between items-center mb-2 w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1 w-fit" style={{ color: 'var(--color-tertiary, #ffd1aa)', background: 'rgba(255,209,170,0.1)' }}>PROJECTED</span>
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>Appreciation</p>
                  </div>
                  <span className="font-bold" style={{ color: 'var(--color-primary)' }}>
                    {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'appreciation', apiPeriodType) : null, '%')}
                  </span>
                </div>
                <div className="flex items-center gap-4 w-full">
                  <div>
                    <h3 className="text-xl font-bold leading-none" style={{ color: 'var(--color-on-background)' }}>
                      {formatValue(latestSnapshot ? getMetricValue(latestSnapshot, 'appreciation', apiPeriodType) : null, '%')}
                    </h3>
                    <p className="text-[10px] mt-1 italic" style={{ color: 'var(--color-on-surface-variant)' }}>Annual Forecast</p>
                  </div>
                  <div className="flex-1 h-8 flex items-center gap-1 rounded-lg px-2">
                    <div className="h-1.5 w-full rounded-full" style={{ background: 'rgba(87,241,219,0.2)' }} />
                    <div className="h-2.5 w-full rounded-full" style={{ background: 'rgba(87,241,219,0.4)' }} />
                    <div className="h-4 w-full rounded-full" style={{ background: 'rgba(87,241,219,0.6)' }} />
                    <div className="h-6 w-full rounded-full" style={{ background: 'var(--color-primary)', boxShadow: '0 0 10px rgba(45,212,191,0.5)' }} />
                    <div className="h-3 w-full rounded-full" style={{ background: 'rgba(87,241,219,0.2)' }} />
                  </div>
                </div>
              </button>
            </section>

            {/* ── Metric Selector & Trend Chart ── */}
            <div className="glass-card rounded-2xl p-6 flex flex-col">
              {/* Metric Pill Selector */}
              <div className="flex flex-wrap gap-2 mb-6">
                {METRICS_CONFIG.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMetric(m.key)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                    style={{
                      background: selectedMetric === m.key ? 'var(--color-primary-container, #2dd4bf)' : 'rgba(255,255,255,0.05)',
                      color: selectedMetric === m.key ? 'var(--color-on-primary-container, #00574d)' : 'var(--color-on-surface-variant)',
                      border: selectedMetric === m.key ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>
                    {activeMetricConfig.desc} Timeline
                  </h4>
                  <p className="text-[10px] font-medium mt-0.5 uppercase tracking-wide" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Historical compound trend via F4 metrics engine
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Value</span>
                </div>
              </div>

              <div className="h-[300px]">
                <MetricChart
                  series={chartSeries}
                  timeWindow={periodType === 'yearly' ? 'annual' : periodType}
                  scope={scope}
                  unit={activeMetricConfig.unit}
                  title={activeMetricConfig.label}
                />
              </div>
            </div>

            {/* ── Performance Ledger Table ── */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface)' }}>
                  Performance Ledger
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>
                    {filteredSnapshots.length} Records
                  </span>
                  <button
                    onClick={handleExportCSV}
                    disabled={isExportDisabled}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40"
                    style={{ color: 'var(--color-on-surface-variant)' }}
                  >
                    <span className="material-symbols-outlined text-base">csv</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={isExportDisabled}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40"
                    style={{ color: 'var(--color-on-surface-variant)' }}
                  >
                    <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-[10px] border-collapse font-mono text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Period</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>NOI</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Cash Flow</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Cap Rate</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>CoC</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>DSCR</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Occupancy</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>OER</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>GRM</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>IRR</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Apprec.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSnapshots.map((s) => (
                      <tr key={s.period} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td className="px-4 py-3.5 font-bold" style={{ color: 'var(--color-on-surface)' }}>
                          {formatPeriodLabel(s.period, apiPeriodType)}
                        </td>
                        <td className="px-4 py-3.5" style={{ color: 'var(--color-on-surface)' }}>{formatValue(getMetricValue(s, 'noi', apiPeriodType), 'currency')}</td>
                        <td className="px-4 py-3.5" style={{ color: 'var(--color-on-surface)' }}>{formatValue(getMetricValue(s, 'cashFlow', apiPeriodType), 'currency')}</td>
                        <td className="px-4 py-3.5" style={{ color: 'var(--color-on-surface)' }}>{formatValue(getMetricValue(s, 'capRate', apiPeriodType), '%')}</td>
                        <td className="px-4 py-3.5" style={{ color: 'var(--color-on-surface)' }}>{formatValue(getMetricValue(s, 'cashOnCashReturn', apiPeriodType), '%')}</td>
                        <td className="px-4 py-3.5" style={{ color: 'var(--color-on-surface)' }}>{formatValue(getMetricValue(s, 'dscr', apiPeriodType), 'ratio')}</td>
                        <td className="px-4 py-3.5" style={{ color: 'var(--color-on-surface)' }}>{formatValue(getMetricValue(s, 'occupancyRate', apiPeriodType), '%')}</td>
                        <td className="px-4 py-3.5" style={{ color: 'var(--color-on-surface)' }}>{formatValue(getMetricValue(s, 'oer', apiPeriodType), '%')}</td>
                        <td className="px-4 py-3.5" style={{ color: 'var(--color-on-surface)' }}>{formatValue(getMetricValue(s, 'grossRentMultiplier', apiPeriodType), '×')}</td>
                        <td className="px-4 py-3.5" style={{ color: 'var(--color-on-surface)' }}>{formatValue(getMetricValue(s, 'irr', apiPeriodType), '%')}</td>
                        <td className="px-4 py-3.5" style={{ color: 'var(--color-on-surface)' }}>{formatValue(getMetricValue(s, 'appreciation', apiPeriodType), '%')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )
      ) : (
        // ── TAX INTELLIGENCE TAB ──
        <div className="space-y-8">
          
          {/* ── Date Range Controls for Tax ── */}
          <div className="glass-card rounded-xl p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Tax Year:</span>
              <div className="glass-card p-1 rounded-lg flex">
                {['2026', '2025', '2024', '2023'].map((y) => (
                  <button
                    key={y}
                    onClick={() => setTaxYear(y)}
                    className="px-3 py-1 rounded-md text-[10px] font-bold transition-all"
                    style={{
                      background: taxYear === y ? 'var(--color-primary-container, #2dd4bf)' : 'transparent',
                      color: taxYear === y ? 'var(--color-on-primary-container, #00574d)' : 'var(--color-on-surface-variant)',
                    }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Period:</span>
              <div className="glass-card p-1 rounded-lg flex">
                {(['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Overall'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setTaxPeriod(p)}
                    className="px-3 py-1 rounded-md text-[10px] font-bold transition-all"
                    style={{
                      background: taxPeriod === p ? 'var(--color-primary-container, #2dd4bf)' : 'transparent',
                      color: taxPeriod === p ? 'var(--color-on-primary-container, #00574d)' : 'var(--color-on-surface-variant)',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Missing Fields Checklist */}
          {taxReportData.missingFields.length > 0 && (
            <div className="glass-card rounded-xl p-4 space-y-2" style={{ borderLeft: '4px solid var(--color-tertiary-container, #ffac5a)' }}>
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-tertiary, #ffd1aa)' }}>
                <span className="material-symbols-outlined text-base">warning</span>
                <span>Needed for Tax Export ({taxReportData.missingFields.length})</span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                The following fields are missing or incomplete. Update them in the project purchases or hold details:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                {taxReportData.missingFields.slice(0, 10).map((field, idx) => (
                  <li key={idx}>{field}</li>
                ))}
                {taxReportData.missingFields.length > 10 && (
                  <li>...and {taxReportData.missingFields.length - 10} more items</li>
                )}
              </ul>
            </div>
          )}

          {/* CPA Reports & Automation Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* CPA-Ready P&L Reports */}
            <div className="glass-card p-8 rounded-3xl lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-on-background)' }}>CPA-Ready P&L Reports</h3>
              </div>
              <div className="space-y-4">
                {/* Report Row: Quarterly */}
                <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ background: 'var(--color-surface-container-highest, #2d363d)' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)' }}>calendar_month</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }}>Quarterly P&L Statement</h4>
                      <p className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>{taxPeriod !== 'Annual' && taxPeriod !== 'Overall' ? `${taxPeriod} ${taxYear}` : `Q1-Q4 ${taxYear}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleExportTaxPDF} disabled={isExportDisabled} className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40" style={{ color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined">picture_as_pdf</span>
                    </button>
                    <button onClick={handleExportTaxCSV} disabled={isExportDisabled} className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40" style={{ color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined">csv</span>
                    </button>
                  </div>
                </div>
                {/* Report Row: Annual */}
                <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ background: 'var(--color-surface-container-highest, #2d363d)' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)' }}>event_note</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }}>Annual Tax Summary</h4>
                      <p className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>FY {taxYear} Consolidated Report</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setTaxPeriod('Annual'); setTimeout(handleExportTaxPDF, 100); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined">picture_as_pdf</span>
                    </button>
                    <button onClick={() => { setTaxPeriod('Annual'); setTimeout(handleExportTaxCSV, 100); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined">csv</span>
                    </button>
                  </div>
                </div>
                {/* Report Row: Overall */}
                <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ background: 'var(--color-surface-container-highest, #2d363d)' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)' }}>history</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }}>Overall Lifetime Ledger</h4>
                      <p className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>Inception to date (ITD)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setTaxPeriod('Overall'); setTimeout(handleExportTaxPDF, 100); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined">picture_as_pdf</span>
                    </button>
                    <button onClick={() => { setTaxPeriod('Overall'); setTimeout(handleExportTaxCSV, 100); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined">csv</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--color-on-surface-variant)' }}>
                <span className="material-symbols-outlined text-sm">info</span>
                <p className="text-[10px] font-semibold">Organized for your tax professional.</p>
              </div>
            </div>

            {/* Automation Card */}
            <div className="glass-card p-8 rounded-3xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-on-background)' }}>Automation</h3>
                <p className="text-xs mb-6" style={{ color: 'var(--color-on-surface-variant)' }}>Schedule regular data exports for your accounting software.</p>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }}>Monthly Auto-sync</span>
                    <div className="w-10 h-5 rounded-full relative" style={{ background: 'rgba(87,241,219,0.2)' }}>
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full" style={{ background: 'var(--color-primary)' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between opacity-50">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }}>QuickBooks Integration</span>
                    <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--color-on-surface-variant)' }}>Beta</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleExportTaxPDF}
                disabled={isExportDisabled}
                className="w-full luminous-button py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold mt-6 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">cloud_upload</span>
                Export to CPA
              </button>
            </div>
          </div>

          {/* ── Full Tax Statement Ledger ── */}
          {!taxReportData.report || (scope === 'portfolio' && taxReportData.activeReports.length === 0) || (scope === 'project' && taxReportData.report.activeMonths === 0) ? (
            <div className="glass-card rounded-2xl p-16 text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-on-surface-variant)' }} />
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface)' }}>No Hold Period Activity</h3>
              <p className="text-[10px] mt-1 max-w-sm mx-auto font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
                No active hold period overlaps with the selected period. 
                PaperWorking renders &quot;no activity&quot; to prevent presenting misleading zero values.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* CPA Disclaimer Box */}
              <div className="glass-card rounded-xl p-5 space-y-3" style={{ borderLeft: '4px solid var(--color-primary, #57f1db)' }}>
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-primary)' }}>
                  <span className="material-symbols-outlined text-base" style={{ color: 'var(--color-primary)' }}>gavel</span>
                  <span>Tax Professional Audit Disclaimer</span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                  This ledger compiles historical transaction entries, approved rehab allocations, and month-by-month mortgage interest amortization. 
                  Real estate investor vs. dealer status, Schedule E expense category boundaries, and depreciation starting methods must be reviewed and finalized by a licensed CPA. 
                  PaperWorking does not compile formal tax filings or provide legal tax advise.
                </p>
              </div>

              {/* Statement Sheet */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--color-on-surface)' }}>Tax Ledger Statement</h3>
                  <span className="text-[9px] font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Active hold period: {taxReportData.report.activeMonths.toFixed(2)} Months
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-xs border-collapse font-mono text-left">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                        <th className="px-6 py-3 font-bold text-[9px] uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Line Item Description</th>
                        <th className="px-6 py-3 font-bold text-right text-[9px] uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      
                      {/* Income */}
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <td className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface)' }} colSpan={2}>Gross Income</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>Gross Rental Income</td>
                        <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(taxReportData.report.rentalIncome, 'currency')}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>Other Income (laundry, parking, utilities fees)</td>
                        <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(taxReportData.report.otherIncome, 'currency')}</td>
                      </tr>
                      {taxReportData.report.isSoldInPeriod && (
                        <tr className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>Sale Proceeds (Gross Exit Value)</td>
                          <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(taxReportData.report.saleProceeds, 'currency')}</td>
                        </tr>
                      )}
                      <tr className="font-bold" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                        <td className="px-6 py-3 pl-8" style={{ color: 'var(--color-on-surface)' }}>Total Gross Income</td>
                        <td className="px-6 py-3 text-right" style={{ color: 'var(--color-primary)' }}>{formatValue(taxReportData.report.totalGrossIncome, 'currency')}</td>
                      </tr>

                      {/* Deductibles */}
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <td className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface)' }} colSpan={2}>Deductible Operating Expenses (Schedule E Aligned)</td>
                      </tr>
                      {[
                        { label: 'Property Taxes', value: taxReportData.report.propertyTaxes },
                        { label: 'Insurance', value: taxReportData.report.insurance },
                        { label: 'Utilities', value: taxReportData.report.utilities },
                        { label: 'Property Management Fees', value: taxReportData.report.propertyManagement },
                        { label: 'Repairs & Maintenance', value: taxReportData.report.repairsMaintenance },
                        { label: 'HOA Fees', value: taxReportData.report.hoaFees },
                        { label: 'Mortgage Interest (Amortized Schedule)', value: taxReportData.report.mortgageInterest },
                      ].map((item) => (
                        <tr key={item.label} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>{item.label}</td>
                          <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(item.value, 'currency')}</td>
                        </tr>
                      ))}
                      <tr className="font-bold" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                        <td className="px-6 py-3 pl-8" style={{ color: 'var(--color-on-surface)' }}>Total Deductible Operating Expenses</td>
                        <td className="px-6 py-3 text-right" style={{ color: 'var(--color-error)' }}>{formatValue(taxReportData.report.totalDeductibleExpenses, 'currency')}</td>
                      </tr>

                      {/* Operating Summary */}
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <td className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface)' }} colSpan={2}>Operating Result Summary</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>Net Operating Result (Income - Deductible Opex excluding Mortgage Interest)</td>
                        <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(taxReportData.report.netOperatingResult, 'currency')}</td>
                      </tr>
                      <tr className="font-bold" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <td className="px-6 py-3 pl-8" style={{ color: 'var(--color-on-surface)' }}>Net Taxable Operating Result</td>
                        <td className="px-6 py-3 text-right" style={{ color: 'var(--color-primary)' }}>{formatValue(taxReportData.report.netTaxableResult, 'currency')}</td>
                      </tr>

                      {/* Non-Deductibles */}
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <td className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface)' }} colSpan={2}>Capitalized Balance Sheet Items (Non-Expensed / Form 4562)</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>Mortgage Principal Paydown</td>
                        <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(taxReportData.report.mortgagePrincipal, 'currency')}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>Approved Rehab / Capital Improvements</td>
                        <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(taxReportData.report.capitalizedRehab, 'currency')}</td>
                      </tr>

                      {/* Depreciation */}
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <td className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface)' }} colSpan={2}>Depreciation Estimate</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>Straight-Line Depreciation Estimate (27.5-Yr Standard)</td>
                        <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(taxReportData.report.depreciationEstimate, 'currency')}</td>
                      </tr>

                      {/* Exit capital gain */}
                      {taxReportData.report.isSoldInPeriod && (
                        <>
                          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <td className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface)' }} colSpan={2}>Capital Gain / Exit Reconciliation (Form 4797)</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>Acquisition Basis (Purchase Price + Acquisition Closing Costs)</td>
                            <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(taxReportData.report.acquisitionBasis, 'currency')}</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>Lifetime Capitalized Rehab / Improvements</td>
                            <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(taxReportData.report.lifetimeCapitalizedRehab, 'currency')}</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="px-6 py-3" style={{ color: 'var(--color-on-surface)' }}>Selling Costs (Commissions + Exit Closing Fees)</td>
                            <td className="px-6 py-3 text-right" style={{ color: 'var(--color-on-surface)' }}>{formatValue(taxReportData.report.sellingCosts, 'currency')}</td>
                          </tr>
                          <tr className="font-bold" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <td className="px-6 py-3 pl-8" style={{ color: taxReportData.report.realizedGainLoss >= 0 ? 'var(--color-primary)' : 'var(--color-error)' }}>Realized Capital Gain / Loss on Sale</td>
                            <td className="px-6 py-3 text-right" style={{ color: taxReportData.report.realizedGainLoss >= 0 ? 'var(--color-primary)' : 'var(--color-error)' }}>{formatValue(taxReportData.report.realizedGainLoss, 'currency')}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
