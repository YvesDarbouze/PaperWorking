'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import {
  computeNOIComponents,
  computeAnnualDebtService,
  computeCashFlow,
  computeDSCR,
  deriveAllMetrics,
  type NOIComponents,
} from '@/lib/metrics/reiMetrics';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from 'recharts';
import {
  DollarSign, TrendingDown, TrendingUp, BarChart3,
  AlertTriangle, CheckCircle, Info, ArrowRight, ShieldCheck,
  Wallet, CreditCard, PiggyBank,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CASH FLOW DEEP DIVE
   Cash Flow = NOI − Debt Service (Mortgage Payments)

   Provides:
   1. KPI strip: Monthly CF, Annual CF, DSCR, Break-Even Occupancy
   2. Waterfall chart: NOI → Debt Service → Cash Flow
   3. NOI vs Debt vs Cash Flow stacked comparison per property
   4. Itemized P&L with debt service and cash flow bottom line
   5. Portfolio aggregation across all projects
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  projects?: Project[];
}

/* ── Formatting ── */
const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const fmtK = (v: number) =>
  Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

/* ── Per-property Cash Flow data ── */
interface PropertyCashFlowData {
  name: string;
  noiComponents: NOIComponents;
  noi: number;
  annualDebtService: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  dscr: number;
  breakEvenOccupancy: number;
  monthlyMortgage: number;
  purchasePrice: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
}

export function deriveCashFlowBreakdowns(projects: Project[]): PropertyCashFlowData[] {
  return projects
    .filter(p => p.financials)
    .map((p) => {
      const f = p.financials!;
      const metrics = deriveAllMetrics(f);
      const noiComponents = metrics.noiComponents;

      return {
        name: (p.propertyName || p.address || 'Unknown').substring(0, 16),
        noiComponents,
        noi: metrics.noi,
        annualDebtService: metrics.annualDebtService,
        annualCashFlow: metrics.annualCashFlow,
        monthlyCashFlow: metrics.monthlyCashFlow,
        dscr: metrics.dscr,
        breakEvenOccupancy: metrics.breakEvenOccupancyRate,
        monthlyMortgage: metrics.annualDebtService > 0
          ? Math.round(metrics.annualDebtService / 12)
          : 0,
        purchasePrice: f.purchasePrice ?? 0,
        loanAmount: f.loanAmount ?? 0,
        interestRate: f.loanInterestRate ?? 0,
        loanTermYears: f.loanTermYears ?? 30,
      };
    })
    .slice(0, 8);
}

/* ── Waterfall data for NOI → DebtService → CashFlow ── */
function buildCashFlowWaterfall(noi: number, annualDebtService: number, annualCashFlow: number) {
  return [
    { name: 'NOI', value: noi, fill: '#595959', type: 'income' },
    { name: 'Debt Service', value: -annualDebtService, fill: '#EF4444', type: 'expense' },
    { name: 'Cash Flow', value: annualCashFlow, fill: annualCashFlow >= 0 ? '#7F7F7F' : '#F97316', type: 'result' },
  ];
}

/* ── Custom waterfall tooltip ── */
function CashFlowTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-lg text-xs"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
      <p className="tabular-nums" style={{ color: d.value >= 0 ? '#595959' : '#EF4444' }}>
        {fmtUSD(d.value)}
      </p>
    </div>
  );
}

/* ── Month-to-month cash flow generator ── */
const CF_MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CF_VAC_MULT = [2.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0];
const CF_UTIL_MULT= [1.4, 1.4, 1.2, 1.0, 0.8, 0.8, 0.8, 0.8, 1.0, 1.2, 1.4, 1.6];
const CF_MAINT_ADD= [155,   0,  55,   0, 105,   0,   0,   0,   5,  55,   0,   0];

interface MonthlyCFPoint {
  month: string;
  noi: number;
  cashFlow: number;
  debtService: number;
}

function generateMonthlyCashFlow(
  noiComponents: NOIComponents,
  annualDebtService: number
): MonthlyCFPoint[] {
  const baseVac   = noiComponents.vacancyLoss / 12;
  const baseMaint = noiComponents.maintenance / 12;
  const baseUtils = noiComponents.utilities / 12;
  const baseMgmt  = noiComponents.propertyManagement / 12;
  const baseTax   = noiComponents.propertyTaxes / 12;
  const baseIns   = noiComponents.insurance / 12;
  const baseHoa   = noiComponents.hoa / 12;
  const monthlyGPI = (noiComponents.grossRentalIncome + noiComponents.otherIncome) / 12;
  const monthlyDebt = annualDebtService / 12;

  return CF_MONTHS.map((month, i) => {
    const vac      = baseVac * CF_VAC_MULT[i];
    const maint    = baseMaint + CF_MAINT_ADD[i];
    const utils    = baseUtils * CF_UTIL_MULT[i];
    const expenses = baseTax + baseIns + utils + baseMgmt + maint + baseHoa;
    const noi      = Math.round(monthlyGPI - vac - expenses);
    const cashFlow = Math.round(noi - monthlyDebt);
    return { month, noi, cashFlow, debtService: Math.round(monthlyDebt) };
  });
}

/* ── Monthly cash flow tooltip ── */
function MonthlyCFTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const cf  = payload.find((p: any) => p.dataKey === 'cashFlow')?.value ?? 0;
  const noi = payload.find((p: any) => p.dataKey === 'noi')?.value ?? 0;
  const ds  = payload.find((p: any) => p.dataKey === 'debtService')?.value ?? 0;
  return (
    <div className="rounded-lg px-3 py-2 shadow-lg text-xs space-y-1"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p style={{ color: '#595959' }}>NOI: {fmtUSD(noi)}</p>
      <p style={{ color: '#EF4444' }}>Debt Service: ({fmtUSD(ds)})</p>
      <p style={{ color: cf >= 0 ? '#7F7F7F' : '#F97316', fontWeight: 700 }}>
        Cash Flow: {cf >= 0 ? '+' : ''}{fmtUSD(cf)}
      </p>
    </div>
  );
}

/* ── DSCR Verdict Badge ── */
function DSCRBadge({ dscr }: { dscr: number }) {
  const isHealthy = dscr >= 1.25;
  const isCovering = dscr >= 1.0;
  const color = isHealthy ? '#595959' : isCovering ? '#A5A5A5' : '#EF4444';
  const bgColor = isHealthy ? 'rgba(89,89,89,0.08)' : isCovering ? 'rgba(165,165,165,0.08)' : 'rgba(239,68,68,0.08)';
  const borderColor = isHealthy ? 'rgba(89,89,89,0.2)' : isCovering ? 'rgba(165,165,165,0.2)' : 'rgba(239,68,68,0.2)';
  const label = isHealthy ? 'Strong Coverage' : isCovering ? 'Marginal Coverage' : 'Negative Coverage';
  const Icon = isHealthy ? ShieldCheck : isCovering ? AlertTriangle : AlertTriangle;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold"
      style={{ background: bgColor, border: `1px solid ${borderColor}`, color }}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>DSCR {dscr === Infinity ? '∞' : dscr.toFixed(2)}x — {label}</span>
    </div>
  );
}

/* ── Cash Flow Statement Line Item ── */
function CFLineItem({
  label,
  monthly,
  annual,
  isIncome = false,
  isTotal = false,
  isSubtotal = false,
  color,
}: {
  label: string;
  monthly: number;
  annual: number;
  isIncome?: boolean;
  isTotal?: boolean;
  isSubtotal?: boolean;
  color?: string;
}) {
  const textColor = color
    ? color
    : isTotal || isSubtotal
      ? annual >= 0 ? '#595959' : '#EF4444'
      : isIncome
        ? 'var(--text-primary)'
        : 'var(--text-secondary)';

  return (
    <div
      className={`grid grid-cols-3 gap-4 py-2 px-3 text-xs ${isTotal || isSubtotal ? 'font-bold' : 'font-medium'}`}
      style={{
        borderBottom: isTotal ? 'none' : '1px solid var(--border-ui)',
        background: isTotal ? 'var(--bg-inset)' : isSubtotal ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderRadius: isTotal ? '6px' : '0',
        color: textColor,
      }}
    >
      <span className="truncate">{label}</span>
      <span className="text-right tabular-nums">
        {isIncome || isTotal || isSubtotal ? fmtUSD(monthly) : `(${fmtUSD(Math.abs(monthly))})`}
      </span>
      <span className="text-right tabular-nums">
        {isIncome || isTotal || isSubtotal ? fmtUSD(annual) : `(${fmtUSD(Math.abs(annual))})`}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function CashFlowDeepDive({ projects: propProjects }: Props) {
  const breakdowns = useMemo(
    () => deriveCashFlowBreakdowns(propProjects || []),
    [propProjects]
  );

  /* ── Portfolio aggregation ── */
  const aggregate = useMemo(() => {
    if (breakdowns.length === 0) return null;
    return breakdowns.reduce(
      (acc, b) => ({
        noi: acc.noi + b.noi,
        annualDebtService: acc.annualDebtService + b.annualDebtService,
        annualCashFlow: acc.annualCashFlow + b.annualCashFlow,
        monthlyCashFlow: acc.monthlyCashFlow + b.monthlyCashFlow,
        totalOperatingExpenses: acc.totalOperatingExpenses + b.noiComponents.totalOperatingExpenses,
        vacancyLoss: acc.vacancyLoss + b.noiComponents.vacancyLoss,
        grossRentalIncome: acc.grossRentalIncome + b.noiComponents.grossRentalIncome,
        otherIncome: acc.otherIncome + b.noiComponents.otherIncome,
      }),
      {
        noi: 0,
        annualDebtService: 0,
        annualCashFlow: 0,
        monthlyCashFlow: 0,
        totalOperatingExpenses: 0,
        vacancyLoss: 0,
        grossRentalIncome: 0,
        otherIncome: 0,
      }
    );
  }, [breakdowns]);

  const portfolioDSCR = aggregate && aggregate.annualDebtService > 0
    ? aggregate.noi / aggregate.annualDebtService
    : aggregate && aggregate.noi > 0 ? Infinity : 0;

  const waterfallData = aggregate
    ? buildCashFlowWaterfall(aggregate.noi, aggregate.annualDebtService, aggregate.annualCashFlow)
    : [];

  const monthlyCFData = useMemo(() => {
    if (!aggregate || !breakdowns[0]) return [];
    const combinedNOIComponents = {
      grossRentalIncome: aggregate.grossRentalIncome,
      otherIncome: aggregate.otherIncome,
      vacancyLoss: aggregate.vacancyLoss,
      propertyTaxes: aggregate.totalOperatingExpenses > 0
        ? breakdowns.reduce((s, b) => s + b.noiComponents.propertyTaxes, 0)
        : 0,
      insurance: breakdowns.reduce((s, b) => s + b.noiComponents.insurance, 0),
      utilities: breakdowns.reduce((s, b) => s + b.noiComponents.utilities, 0),
      propertyManagement: breakdowns.reduce((s, b) => s + b.noiComponents.propertyManagement, 0),
      maintenance: breakdowns.reduce((s, b) => s + b.noiComponents.maintenance, 0),
      hoa: breakdowns.reduce((s, b) => s + b.noiComponents.hoa, 0),
      totalOperatingExpenses: aggregate.totalOperatingExpenses,
      noi: aggregate.noi,
    };
    return generateMonthlyCashFlow(combinedNOIComponents, aggregate.annualDebtService);
  }, [aggregate, breakdowns]);

  if (!aggregate || aggregate.grossRentalIncome === 0) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <Info className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add a property with income, expense, and loan data to see your Cash Flow analysis.
        </p>
      </div>
    );
  }

  const isPositive = aggregate.annualCashFlow >= 0;

  /* ── Expense composition for donut (including debt service) ── */
  const expenseDonut = [
    { name: 'Operating Costs', value: aggregate.totalOperatingExpenses + aggregate.vacancyLoss, fill: '#A5A5A5' },
    { name: 'Debt Service', value: aggregate.annualDebtService, fill: '#EF4444' },
  ].filter(i => i.value > 0);

  return (
    <div className="w-full space-y-6">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: isPositive ? 'rgba(127,127,127,0.1)' : 'rgba(239,68,68,0.1)' }}>
            <Wallet className="w-5 h-5" style={{ color: isPositive ? '#7F7F7F' : '#EF4444' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Cash Flow Analysis
            </h3>
            <p className="text-xs text-text-secondary">
              NOI − Debt Service = What lands in your account
            </p>
          </div>
        </div>
        <DSCRBadge dscr={portfolioDSCR} />
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: TrendingUp,
            label: 'Monthly Cash Flow',
            value: `${isPositive ? '+' : ''}${fmtUSD(aggregate.monthlyCashFlow)}`,
            sublabel: 'After debt service',
            color: isPositive ? '#7F7F7F' : '#EF4444',
          },
          {
            icon: PiggyBank,
            label: 'Annual Cash Flow',
            value: `${isPositive ? '+' : ''}${fmtUSD(aggregate.annualCashFlow)}`,
            sublabel: `NOI ${fmtUSD(aggregate.noi)} − DS ${fmtUSD(aggregate.annualDebtService)}`,
            color: isPositive ? '#595959' : '#EF4444',
          },
          {
            icon: CreditCard,
            label: 'Monthly Mortgage',
            value: fmtUSD(Math.round(aggregate.annualDebtService / 12)),
            sublabel: `${fmtUSD(aggregate.annualDebtService)}/yr total`,
            color: '#EF4444',
          },
          {
            icon: ShieldCheck,
            label: 'DSCR',
            value: portfolioDSCR === Infinity ? '∞' : portfolioDSCR.toFixed(2) + 'x',
            sublabel: portfolioDSCR >= 1.25 ? 'Strong coverage' : portfolioDSCR >= 1.0 ? 'Marginal' : 'Under-covered',
            color: portfolioDSCR >= 1.25 ? '#595959' : portfolioDSCR >= 1.0 ? '#A5A5A5' : '#EF4444',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="rounded-lg p-4 flex flex-col gap-2"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
          >
            <div className="flex items-center gap-2">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {kpi.label}
              </span>
            </div>
            <p className="text-lg font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {kpi.value}
            </p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              {kpi.sublabel}
            </p>
          </div>
        ))}
      </div>

      {/* ── Waterfall + Expense Split Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Waterfall — 3 cols */}
        <div
          className="lg:col-span-3 bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col"
          style={{ minHeight: '320px' }}
        >
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
            Cash Flow Waterfall — Portfolio
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F2" />
                <XAxis
                  dataKey="name"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  height={40}
                />
                <YAxis
                  fontSize={9}
                  tickFormatter={fmtK}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <Tooltip content={<CashFlowTooltip />} />
                <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Where your money goes — donut */}
        <div
          className="lg:col-span-2 bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col"
          style={{ minHeight: '320px' }}
        >
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
            Where Your Rent Goes
          </h4>
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    ...expenseDonut,
                    ...(isPositive ? [{ name: 'Cash Flow', value: aggregate.annualCashFlow, fill: '#7F7F7F' }] : []),
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="72%"
                  paddingAngle={3}
                  dataKey="value"
                >
                  {[
                    ...expenseDonut,
                    ...(isPositive ? [{ name: 'Cash Flow', value: aggregate.annualCashFlow, fill: '#7F7F7F' }] : []),
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => fmtUSD(Number(value))}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
              <div className="text-center">
                <span className="block text-xl font-bold" style={{ color: isPositive ? '#7F7F7F' : '#EF4444' }}>
                  {isPositive ? '+' : ''}{fmtUSD(aggregate.annualCashFlow)}
                </span>
                <span className="block text-[9px] uppercase tracking-wider text-text-secondary">
                  Cash Flow
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cash Flow Statement ── */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4" style={{ color: '#7F7F7F' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
            Cash Flow Statement — Annualized
          </h4>
        </div>

        {/* Header */}
        <div
          className="grid grid-cols-3 gap-4 py-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] rounded-t-md"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}
        >
          <span>Line Item</span>
          <span className="text-right">Monthly</span>
          <span className="text-right">Annual</span>
        </div>

        {/* GPI */}
        <CFLineItem
          label="Gross Potential Income"
          monthly={(aggregate.grossRentalIncome + aggregate.otherIncome) / 12}
          annual={aggregate.grossRentalIncome + aggregate.otherIncome}
          isIncome
        />

        {/* Losses & OpEx */}
        <div
          className="my-2 px-3 flex items-center gap-2 py-1"
          style={{ borderTop: '1px dashed var(--border-ui)' }}
        >
          <ArrowRight className="w-3 h-3 text-[#595959]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#595959]">
            Vacancy & Operating Expenses
          </span>
        </div>

        <CFLineItem
          label="Vacancy + Operating Costs"
          monthly={(aggregate.totalOperatingExpenses + aggregate.vacancyLoss) / 12}
          annual={aggregate.totalOperatingExpenses + aggregate.vacancyLoss}
        />

        {/* NOI subtotal */}
        <div className="mt-2 mb-1 px-3">
          <div
            className="grid grid-cols-3 gap-4 py-2 px-3 text-xs font-bold rounded-md"
            style={{ background: 'rgba(89,89,89,0.06)', color: '#595959' }}
          >
            <span>= Net Operating Income</span>
            <span className="text-right tabular-nums">{fmtUSD(aggregate.noi / 12)}</span>
            <span className="text-right tabular-nums">{fmtUSD(aggregate.noi)}</span>
          </div>
        </div>

        {/* Debt service */}
        <div
          className="my-2 px-3 flex items-center gap-2 py-1"
          style={{ borderTop: '1px dashed var(--border-ui)' }}
        >
          <ArrowRight className="w-3 h-3 text-[#595959]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#595959]">
            Debt Service (Mortgage)
          </span>
        </div>

        <CFLineItem
          label="Annual Debt Service"
          monthly={aggregate.annualDebtService / 12}
          annual={aggregate.annualDebtService}
        />

        {/* Cash Flow result */}
        <div className="mt-3">
          <CFLineItem
            label="= Cash Flow"
            monthly={aggregate.monthlyCashFlow}
            annual={aggregate.annualCashFlow}
            isTotal
          />
        </div>

        {/* Cash Flow health callout */}
        <div
          className="mt-4 px-4 py-3 rounded-lg text-[11px] leading-relaxed"
          style={{
            background: isPositive ? 'rgba(127,127,127,0.05)' : 'rgba(239,68,68,0.05)',
            border: `1px solid ${isPositive ? 'rgba(127,127,127,0.15)' : 'rgba(239,68,68,0.15)'}`,
            color: 'var(--text-secondary)',
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Cash Flow Formula:</strong>{' '}
          <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>
            Cash Flow = NOI − Debt Service (Mortgage Payments)
          </code>
          <br />
          <strong style={{ color: 'var(--text-primary)' }}>Why it matters:</strong>{' '}
          Cash flow determines whether a property pays you or costs you each month.
          A property with positive cash flow can weather surprise repairs, vacancies, and financing costs without depleting your reserves.
          <br />
          <strong style={{ color: 'var(--text-primary)' }}>DSCR:</strong>{' '}
          Debt Service Coverage Ratio = NOI ÷ Debt Service. Above 1.25x is strong; below 1.0x means the property loses money.
        </div>
      </div>

      {/* ── Month-to-Month Cash Flow Trend ── */}
      {monthlyCFData.length > 0 && (
        <div
          className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col"
          style={{ minHeight: '320px' }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
              Monthly Cash Flow Trend — NOI vs. Debt Service
            </h4>
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-[0.1em]"
              style={{ background: 'rgba(127,127,127,0.1)', color: '#7F7F7F', border: '1px solid rgba(127,127,127,0.2)' }}
            >
              Seasonal estimate
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCFData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cfPosGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7F7F7F" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7F7F7F" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="noiLineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#595959" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#595959" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(229,231,235,0.3)" />
                <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={9} tickFormatter={fmtK} tickLine={false} axisLine={false} width={52} />
                <Tooltip content={<MonthlyCFTooltip />} />
                <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: 'Break-even', position: 'insideTopRight', fontSize: 9, fill: '#9CA3AF' }} />
                <Area
                  type="monotone"
                  dataKey="noi"
                  stroke="#595959"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="url(#noiLineGrad)"
                  dot={false}
                  name="NOI"
                />
                <Area
                  type="monotone"
                  dataKey="cashFlow"
                  stroke="#7F7F7F"
                  strokeWidth={2}
                  fill="url(#cfPosGrad)"
                  dot={{ r: 3, fill: '#7F7F7F', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  name="Cash Flow"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-emerald-500" style={{ borderTop: '1.5px dashed #10B981' }} />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>NOI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5" style={{ background: '#7F7F7F' }} />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Cash Flow (after debt service)</span>
            </div>
          </div>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-secondary)', opacity: 0.55 }}>
            Seasonal variance applied: summer vacancy zero, winter utilities +40%, spring/winter maintenance spikes.
            Monthly mortgage payment deducted from NOI each month to arrive at cash flow.
          </p>
        </div>
      )}

      {/* ── Per-Property Comparison ── */}
      {breakdowns.length > 1 && (
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '300px' }}>
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
            Cash Flow by Property — Portfolio View
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdowns.map(b => ({
                  name: b.name,
                  'NOI': b.noi,
                  'Debt Service': -b.annualDebtService,
                  'Cash Flow': b.annualCashFlow,
                }))}
                margin={{ top: 10, right: 10, left: -10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F2" />
                <XAxis
                  dataKey="name"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  fontSize={10}
                  tickFormatter={fmtK}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(value: any) => fmtUSD(Number(value))}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px' }}
                />
                <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
                <Bar dataKey="NOI" fill="#595959" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Debt Service" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Cash Flow" fill="#7F7F7F" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
