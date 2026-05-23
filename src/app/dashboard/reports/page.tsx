'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Users, 
  DollarSign, 
  Download, 
  FileText, 
  Building,
  Target,
  Percent,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
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
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* ── Page Title ── */}
      <div className="flex justify-between items-end border-b border-border-ui pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <div className="bg-pw-black p-1.5 rounded-none text-white">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-pw-black uppercase tracking-[0.2em]">Portfolio Intelligence</span>
          </div>
          <h1 className="text-3xl font-light text-text-primary tracking-tight">
            {reportsTab === 'performance' ? 'Performance Snapshots' : 'Tax Ledger (CPA Export)'}
          </h1>
          <p className="text-text-secondary text-xs font-medium mt-1">
            {reportsTab === 'performance' 
              ? 'Aggregated historical financials, yields, and analytics.' 
              : 'Period P&L statements mapped to Schedule E / Form 4797 line items.'}
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={reportsTab === 'performance' ? handleExportCSV : handleExportTaxCSV}
            disabled={isExportDisabled}
            className="flex items-center gap-1.5 px-4 py-2 border border-border-ui bg-bg-surface text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary hover:border-pw-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button 
            onClick={reportsTab === 'performance' ? handleExportPDF : handleExportTaxPDF}
            disabled={isExportDisabled}
            className="flex items-center gap-1.5 px-4 py-2 bg-pw-black text-white text-[10px] font-bold uppercase tracking-wider hover:bg-pw-fg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* ── Sub-tab Toggle ── */}
      <div className="flex border-b border-border-ui">
        <button
          onClick={() => setReportsTab('performance')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            reportsTab === 'performance' 
              ? 'border-pw-black text-text-primary' 
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Performance Snapshots
        </button>
        <button
          onClick={() => setReportsTab('tax')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            reportsTab === 'tax' 
              ? 'border-pw-black text-text-primary' 
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Tax Ledger (CPA Export)
        </button>
      </div>

      {/* ── Selectors Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-6 p-5 border border-border-ui bg-bg-surface">
        
        {/* Scope Selector */}
        <div className="flex items-center gap-4">
          <div className="flex border border-border-ui p-0.5 bg-bg-primary">
            <button
              onClick={() => setScope('portfolio')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                scope === 'portfolio' ? 'bg-pw-black text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Whole Portfolio
            </button>
            <button
              onClick={() => setScope('project')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                scope === 'project' ? 'bg-pw-black text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Single Project
            </button>
          </div>

          {scope === 'project' && (
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-bg-surface border border-border-ui px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text-primary outline-none focus:border-pw-black appearance-none pr-8 min-w-[180px]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.propertyName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                <ChevronRight className="w-3 h-3 rotate-90" />
              </div>
            </div>
          )}
        </div>

        {/* Period Selector / Year Selector */}
        {reportsTab === 'performance' ? (
          <>
            <div className="flex items-center gap-4">
              <div className="flex border border-border-ui p-0.5 bg-bg-primary">
                {([
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'quarterly', label: 'Quarterly' },
                  { id: 'yearly', label: 'Yearly' },
                  { id: 'overall', label: 'Overall' }
                ] as const).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPeriodType(p.id);
                      setStartDate('');
                      setEndDate('');
                    }}
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      periodType === p.id ? 'bg-pw-black text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">Filter Range:</span>
              <input 
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-border-ui bg-bg-surface text-text-primary px-3 py-1.5 text-[10px] font-bold outline-none focus:border-pw-black font-mono"
                placeholder="Start Month"
              />
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">to</span>
              <input 
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-border-ui bg-bg-surface text-text-primary px-3 py-1.5 text-[10px] font-bold outline-none focus:border-pw-black font-mono"
                placeholder="End Month"
              />
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-[9px] font-bold uppercase tracking-wider text-rose-500 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">Tax Year:</span>
              <div className="relative">
                <select
                  value={taxYear}
                  onChange={(e) => setTaxYear(e.target.value)}
                  className="bg-bg-surface border border-border-ui px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text-primary outline-none focus:border-pw-black appearance-none pr-8 min-w-[100px]"
                >
                  {['2026', '2025', '2024', '2023'].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                  <ChevronRight className="w-3 h-3 rotate-90" />
                </div>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">Period:</span>
              <div className="flex border border-border-ui p-0.5 bg-bg-primary">
                {(['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Overall'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setTaxPeriod(p)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      taxPeriod === p ? 'bg-pw-black text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {reportsTab === 'performance' ? (
        // ── PERFORMANCE REPORTING TAB ──
        loading ? (
          <div className="h-96 flex items-center justify-center border border-border-ui bg-bg-surface">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-pw-black" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Loading Snapshots...</span>
            </div>
          </div>
        ) : filteredSnapshots.length === 0 ? (
          <div className="bg-bg-surface border border-border-ui p-16 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-3 text-text-secondary opacity-30" />
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest">No Activity</h3>
            <p className="text-[10px] text-text-secondary mt-1 max-w-sm mx-auto font-medium">
              No real snapshot records exist for this period range. 
              PaperWorking renders "no activity" to safeguard reports from displaying deceptive zero-value entries.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Left Sidebar Metric Tabs */}
            <div className="lg:col-span-1 flex flex-col gap-2">
              <div className="px-2 py-1 bg-pw-black/5 text-[9px] font-bold uppercase tracking-widest text-text-secondary mb-1">
                Select Metric to Trend
              </div>
              {METRICS_CONFIG.map((m) => {
                const isSelected = selectedMetric === m.key;
                const val = latestSnapshot ? getMetricValue(latestSnapshot, m.key, apiPeriodType) : null;
                
                return (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMetric(m.key)}
                    className="w-full text-left p-3.5 border transition-all flex flex-col justify-between h-20"
                    style={{
                      borderColor: isSelected ? 'var(--pw-black, #000000)' : 'var(--border-ui)',
                      background: isSelected ? 'var(--pw-black, #0d0d0d)' : 'var(--bg-surface)',
                      color: isSelected ? '#ffffff' : 'var(--text-primary)'
                    }}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{m.label}</span>
                      <span className="text-[9px] font-medium opacity-65 truncate max-w-[80px]">{m.desc}</span>
                    </div>
                    <span className="text-lg font-light tracking-tight font-mono mt-1">
                      {formatValue(val, m.unit)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Main Trend Chart */}
            <div className="lg:col-span-3 space-y-6">
              
              <div className="bg-bg-surface border border-border-ui p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                      {activeMetricConfig.desc} Timeline
                    </h4>
                    <p className="text-[10px] text-text-secondary font-medium mt-0.5 uppercase tracking-wide">
                      Historical compound trend via F4 metrics engine
                  </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pw-black" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">Value</span>
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

              {/* Summary Data Grid */}
              <div className="bg-bg-surface border border-border-ui overflow-hidden">
                <div className="px-6 py-4 border-b border-border-ui bg-bg-primary flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-widest">
                    Performance Ledger
                  </h4>
                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">
                    {filteredSnapshots.length} Records
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse font-mono text-left">
                    <thead>
                      <tr className="bg-bg-primary border-b border-border-ui">
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">Period</th>
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">NOI</th>
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">Cash Flow</th>
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">Cap Rate</th>
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">CoC</th>
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">DSCR</th>
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">Occupancy</th>
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">OER</th>
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">GRM</th>
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">IRR</th>
                        <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-wider">Appreciation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-ui">
                      {filteredSnapshots.map((s) => (
                        <tr key={s.period} className="hover:bg-bg-primary transition-colors">
                          <td className="px-4 py-3.5 font-bold text-text-primary">
                            {formatPeriodLabel(s.period, apiPeriodType)}
                          </td>
                          <td className="px-4 py-3.5">
                            {formatValue(getMetricValue(s, 'noi', apiPeriodType), 'currency')}
                          </td>
                          <td className="px-4 py-3.5">
                            {formatValue(getMetricValue(s, 'cashFlow', apiPeriodType), 'currency')}
                          </td>
                          <td className="px-4 py-3.5">
                            {formatValue(getMetricValue(s, 'capRate', apiPeriodType), '%')}
                          </td>
                          <td className="px-4 py-3.5">
                            {formatValue(getMetricValue(s, 'cashOnCashReturn', apiPeriodType), '%')}
                          </td>
                          <td className="px-4 py-3.5">
                            {formatValue(getMetricValue(s, 'dscr', apiPeriodType), 'ratio')}
                          </td>
                          <td className="px-4 py-3.5">
                            {formatValue(getMetricValue(s, 'occupancyRate', apiPeriodType), '%')}
                          </td>
                          <td className="px-4 py-3.5">
                            {formatValue(getMetricValue(s, 'oer', apiPeriodType), '%')}
                          </td>
                          <td className="px-4 py-3.5">
                            {formatValue(getMetricValue(s, 'grossRentMultiplier', apiPeriodType), '×')}
                          </td>
                          <td className="px-4 py-3.5">
                            {formatValue(getMetricValue(s, 'irr', apiPeriodType), '%')}
                          </td>
                          <td className="px-4 py-3.5">
                            {formatValue(getMetricValue(s, 'appreciation', apiPeriodType), '%')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )
      ) : (
        // ── TAX LEDGER SUB-TAB (CPA EXPORT) ──
        <div className="space-y-6 max-w-4xl mx-auto">
          
          {/* Missing Fields Checklist */}
          {taxReportData.missingFields.length > 0 && (
            <div className="border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800 space-y-2 rounded-none">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-900">
                <span>⚠️ Needed for Tax Export ({taxReportData.missingFields.length})</span>
              </div>
              <p className="text-[10px] text-amber-700">
                The following fields are missing or incomplete. Please update them in the project purchases or hold details to ensure a complete tax filing ledger:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[10px]">
                {taxReportData.missingFields.slice(0, 10).map((field, idx) => (
                  <li key={idx}>{field}</li>
                ))}
                {taxReportData.missingFields.length > 10 && (
                  <li>...and {taxReportData.missingFields.length - 10} more items</li>
                )}
              </ul>
            </div>
          )}

          {/* Main Statement Ledger */}
          {!taxReportData.report || (scope === 'portfolio' && taxReportData.activeReports.length === 0) || (scope === 'project' && taxReportData.report.activeMonths === 0) ? (
            <div className="bg-bg-surface border border-border-ui p-16 text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-3 text-text-secondary opacity-30" />
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest">No Hold Period Activity</h3>
              <p className="text-[10px] text-text-secondary mt-1 max-w-sm mx-auto font-medium">
                No active hold period overlaps with the selected period. 
                PaperWorking renders "no activity" to prevent presenting misleading zero values.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* CPA Disclaimer Box */}
              <div className="border border-border-ui bg-bg-surface p-5 space-y-3">
                <div className="flex items-center gap-2 text-pw-black font-bold uppercase tracking-wider text-[10px]">
                  <Target className="w-4 h-4 text-pw-black" />
                  <span>Tax Professional Audit Disclaimer</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  This ledger compiles historical transaction entries, approved rehab allocations, and month-by-month mortgage interest amortization. 
                  Real estate investor vs. dealer status, Schedule E expense category boundaries, and depreciation starting methods must be reviewed and finalized by a licensed CPA. 
                  PaperWorking does not compile formal tax filings or provide legal tax advise.
                </p>
              </div>

              {/* Statement Sheet */}
              <div className="border border-border-ui bg-bg-surface overflow-hidden">
                <div className="px-6 py-4 border-b border-border-ui bg-bg-primary flex justify-between items-center">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest font-mono">Tax Ledger Statement</h3>
                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest font-mono">
                    Active hold period: {taxReportData.report.activeMonths.toFixed(2)} Months
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse font-mono text-left">
                    <thead>
                      <tr className="bg-bg-primary border-b border-border-ui text-[9px] uppercase tracking-wider text-text-secondary">
                        <th className="px-6 py-3 font-bold">Line Item Description</th>
                        <th className="px-6 py-3 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-ui">
                      
                      {/* Income */}
                      <tr className="bg-bg-primary/50 text-[10px] font-bold uppercase tracking-wider text-text-primary">
                        <td className="px-6 py-2.5" colSpan={2}>Gross Income</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Gross Rental Income</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.rentalIncome, 'currency')}</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Other Income (laundry, parking, utilities fees)</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.otherIncome, 'currency')}</td>
                      </tr>
                      {taxReportData.report.isSoldInPeriod && (
                        <tr className="hover:bg-bg-primary/30">
                          <td className="px-6 py-3">Sale Proceeds (Gross Exit Value)</td>
                          <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.saleProceeds, 'currency')}</td>
                        </tr>
                      )}
                      <tr className="font-bold border-b border-border-ui bg-bg-primary/20">
                        <td className="px-6 py-3 pl-8">Total Gross Income</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.totalGrossIncome, 'currency')}</td>
                      </tr>

                      {/* Deductibles */}
                      <tr className="bg-bg-primary/50 text-[10px] font-bold uppercase tracking-wider text-text-primary">
                        <td className="px-6 py-2.5" colSpan={2}>Deductible Operating Expenses (Schedule E Aligned)</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Property Taxes</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.propertyTaxes, 'currency')}</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Insurance</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.insurance, 'currency')}</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Utilities</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.utilities, 'currency')}</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Property Management Fees</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.propertyManagement, 'currency')}</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Repairs & Maintenance</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.repairsMaintenance, 'currency')}</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">HOA Fees</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.hoaFees, 'currency')}</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Mortgage Interest (Amortized Schedule)</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.mortgageInterest, 'currency')}</td>
                      </tr>
                      <tr className="font-bold border-b border-border-ui bg-bg-primary/20">
                        <td className="px-6 py-3 pl-8">Total Deductible Operating Expenses</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.totalDeductibleExpenses, 'currency')}</td>
                      </tr>

                      {/* Operating Summary */}
                      <tr className="bg-bg-primary/50 text-[10px] font-bold uppercase tracking-wider text-text-primary">
                        <td className="px-6 py-2.5" colSpan={2}>Operating Result Summary</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Net Operating Result (Income - Deductible Opex excluding Mortgage Interest)</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.netOperatingResult, 'currency')}</td>
                      </tr>
                      <tr className="font-bold bg-bg-primary/20">
                        <td className="px-6 py-3 pl-8">Net Taxable Operating Result</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.netTaxableResult, 'currency')}</td>
                      </tr>

                      {/* Non-Deductibles */}
                      <tr className="bg-bg-primary/50 text-[10px] font-bold uppercase tracking-wider text-text-primary">
                        <td className="px-6 py-2.5" colSpan={2}>Capitalized Balance Sheet Items (Non-Expensed / Form 4562)</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Mortgage Principal Paydown</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.mortgagePrincipal, 'currency')}</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Approved Rehab / Capital Improvements</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.capitalizedRehab, 'currency')}</td>
                      </tr>

                      {/* Depreciation */}
                      <tr className="bg-bg-primary/50 text-[10px] font-bold uppercase tracking-wider text-text-primary">
                        <td className="px-6 py-2.5" colSpan={2}>Depreciation Estimate</td>
                      </tr>
                      <tr className="hover:bg-bg-primary/30">
                        <td className="px-6 py-3">Straight-Line Depreciation Estimate (27.5-Yr Standard)</td>
                        <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.depreciationEstimate, 'currency')}</td>
                      </tr>

                      {/* Exit capital gain */}
                      {taxReportData.report.isSoldInPeriod && (
                        <>
                          <tr className="bg-bg-primary/50 text-[10px] font-bold uppercase tracking-wider text-text-primary">
                            <td className="px-6 py-2.5" colSpan={2}>Capital Gain / Exit Reconciliation (Form 4797)</td>
                          </tr>
                          <tr className="hover:bg-bg-primary/30">
                            <td className="px-6 py-3">Acquisition Basis (Purchase Price + Acquisition Closing Costs)</td>
                            <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.acquisitionBasis, 'currency')}</td>
                          </tr>
                          <tr className="hover:bg-bg-primary/30">
                            <td className="px-6 py-3">Lifetime Capitalized Rehab / Improvements</td>
                            <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.lifetimeCapitalizedRehab, 'currency')}</td>
                          </tr>
                          <tr className="hover:bg-bg-primary/30">
                            <td className="px-6 py-3">Selling Costs (Commissions + Exit Closing Fees)</td>
                            <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.sellingCosts, 'currency')}</td>
                          </tr>
                          <tr className={`font-bold bg-bg-primary/20 ${taxReportData.report.realizedGainLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            <td className="px-6 py-3 pl-8">Realized Capital Gain / Loss on Sale</td>
                            <td className="px-6 py-3 text-right">{formatValue(taxReportData.report.realizedGainLoss, 'currency')}</td>
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
