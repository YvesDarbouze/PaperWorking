import PDFDocument from 'pdfkit';
import { METRICS_REGISTRY, MetricRegistryEntry } from '@/lib/metrics/metricRegistry';

// Brand Color Palette
const COLORS = {
  primary: '#121014',     // Dark slate
  secondary: '#454955',   // Medium gray
  accent: '#10b981',      // Emerald green
  warning: '#f59e0b',     // Amber yellow
  danger: '#ef4444',      // Red
  border: '#e2e8f0',      // Light border
  bgLight: '#f8fafc',     // Row alt bg
  textDark: '#0f172a',    // Dark text
  textMuted: '#64748b',   // Muted text
  textLight: '#ffffff'    // White text
};

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function getBenchmarkColor(entry: MetricRegistryEntry, value: number | null): string {
  if (value === null || isNaN(value)) return COLORS.textMuted;
  const { good, warning, bad } = entry.benchmark;

  if (good === null && warning === null && bad === null) return COLORS.textMuted;

  const lowerIsBetter = [
    'grm', 'ltv', 'oer', 'tenant_turnover', 'days_on_market', 'maintenance_per_unit', 'risk_score'
  ].includes(entry.id);

  if (lowerIsBetter) {
    if (good !== null && value <= good) return COLORS.accent;
    if (warning !== null && value <= warning) return COLORS.warning;
    return COLORS.danger;
  } else {
    if (good !== null && value >= good) return COLORS.accent;
    if (warning !== null && value >= warning) return COLORS.warning;
    return COLORS.danger;
  }
}

export function generateReportPDF(
  scope: 'portfolio' | 'project',
  projects: any[],
  transactions: any[],
  investorName: string,
  isPremium: boolean,
  projectId?: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));

    const selectedProjects = scope === 'project' && projectId
      ? projects.filter(p => p.id === projectId)
      : projects;

    const reportTitle = scope === 'portfolio'
      ? 'Portfolio Performance Report'
      : 'Project Performance Report';

    // ────────────────────────────────────────────────────────────────────────
    // PAGE 1: COVER PAGE
    // ────────────────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.primary);

    // Title Block
    doc.fillColor(COLORS.accent)
       .font('Helvetica-Bold')
       .fontSize(32)
       .text('PaperWorking', 50, 180);

    doc.fillColor(COLORS.textLight)
       .font('Helvetica-Bold')
       .fontSize(24)
       .text(reportTitle, 50, 230);

    if (!isPremium) {
      doc.fillColor(COLORS.warning)
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('PREVIEW MODE — UPGRADE TO PREMIUM FOR FULL REPORT', 50, 270);
    }

    // Metadata Block
    doc.fillColor(COLORS.textMuted)
       .font('Helvetica')
       .fontSize(12)
       .text('Generated for:', 50, 480);

    doc.fillColor(COLORS.textLight)
       .font('Helvetica-Bold')
       .text(investorName || 'Premium Investor', 50, 500);

    doc.fillColor(COLORS.textMuted)
       .font('Helvetica')
       .text('Date:', 300, 480);

    doc.fillColor(COLORS.textLight)
       .font('Helvetica-Bold')
       .text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 300, 500);

    // ────────────────────────────────────────────────────────────────────────
    // PAGE 2: EXECUTIVE SUMMARY
    // ────────────────────────────────────────────────────────────────────────
    doc.addPage();

    doc.fillColor(COLORS.textDark)
       .font('Helvetica-Bold')
       .fontSize(20)
       .text('Executive Summary', 50, 50);

    doc.strokeColor(COLORS.border)
       .lineWidth(1)
       .moveTo(50, 80)
       .lineTo(540, 80)
       .stroke();

    // Select 10 primary KPIs to display
    const primaryKPIIds = [
      'noi', 'cap_rate', 'cash_on_cash', 'irr', 'dscr', 'ltv', 'oer', 'grm', 'occupancy_rate', 'risk_score'
    ];
    const primaryMetrics = METRICS_REGISTRY.filter(m => primaryKPIIds.includes(m.id));

    // Dynamic grid layout (2 columns, 5 rows)
    let y = 100;
    primaryMetrics.forEach((metric, index) => {
      const isCol2 = index % 2 !== 0;
      const colX = isCol2 ? 300 : 50;
      const rowY = y + Math.floor(index / 2) * 60;

      // Card Background
      doc.rect(colX, rowY, 230, 50)
         .fill(COLORS.bgLight);

      // KPI Indicator Dot
      let val: number | null = null;
      if (scope === 'portfolio') {
        val = metric.compute(null, selectedProjects);
      } else if (selectedProjects.length > 0) {
        val = metric.compute(selectedProjects[0]);
      }

      const dotColor = getBenchmarkColor(metric, val);
      doc.circle(colX + 15, rowY + 25, 5).fill(dotColor);

      // KPI Label
      doc.fillColor(COLORS.textMuted)
         .font('Helvetica')
         .fontSize(9)
         .text(metric.name, colX + 30, rowY + 12);

      // KPI Value
      let displayVal = 'N/A';
      if (val !== null && !isNaN(val)) {
        if (!isPremium && ['noi', 'cap_rate', 'cash_on_cash', 'irr', 'dscr', 'ltv', 'oer', 'grm'].includes(metric.id)) {
          displayVal = '[Locked]';
        } else if (metric.unit === 'currency') {
          displayVal = fmtUSD(val);
        } else if (metric.unit === 'percent') {
          displayVal = `${val.toFixed(2)}%`;
        } else if (metric.unit === 'ratio') {
          displayVal = val.toFixed(2);
        } else {
          displayVal = String(val);
        }
      }

      doc.fillColor(COLORS.textDark)
         .font('Courier-Bold')
         .fontSize(12)
         .text(displayVal, colX + 30, rowY + 26);
    });

    // Dynamic 1-sentence interpretation
    const interpretationY = y + 320;
    let capRateVal: number | null = null;
    if (scope === 'portfolio') {
      capRateVal = METRICS_REGISTRY.find(m => m.id === 'cap_rate')?.compute(null, selectedProjects) ?? null;
    } else if (selectedProjects.length > 0) {
      capRateVal = METRICS_REGISTRY.find(m => m.id === 'cap_rate')?.compute(selectedProjects[0]) ?? null;
    }

    let interpretation = 'Your portfolio metrics are computed and aligned against standard CCIM benchmarks.';
    if (capRateVal !== null && !isNaN(capRateVal)) {
      if (!isPremium) {
        interpretation = 'Upgrade to Premium to unlock dynamic performance interpretation and CCIM benchmark alignment details.';
      } else {
        const meetsBenchmark = capRateVal >= 6.0;
        interpretation = `Your ${scope === 'portfolio' ? 'portfolio' : 'project'} Capitalization Rate of ${capRateVal.toFixed(1)}% ${
          meetsBenchmark ? 'meets or exceeds' : 'is currently below'
        } the target investor benchmark of 6.0%.`;
      }
    }

    doc.rect(50, interpretationY, 490, 45)
       .fill('#f0fdf4');

    doc.fillColor('#15803d')
       .font('Helvetica-Bold')
       .fontSize(9)
       .text('Tactical Insight:', 60, interpretationY + 10);

    doc.fillColor('#166534')
       .font('Helvetica')
       .fontSize(9.5)
       .text(interpretation, 60, interpretationY + 24, { width: 470 });

    // ────────────────────────────────────────────────────────────────────────
    // PAGES 3+: PROJECT DETAIL PAGES
    // ────────────────────────────────────────────────────────────────────────
    selectedProjects.forEach(project => {
      doc.addPage();

      doc.fillColor(COLORS.textDark)
         .font('Helvetica-Bold')
         .fontSize(18)
         .text(project.propertyName || project.address || 'Unnamed Project', 50, 50);

      doc.fillColor(COLORS.textMuted)
         .font('Helvetica')
         .fontSize(10)
         .text(`Phase: ${project.phase || project.status || 'Hold'}  |  Strategy: ${project.subStrategy || 'Long Term'}`, 50, 72);

      doc.strokeColor(COLORS.border)
         .lineWidth(1)
         .moveTo(50, 88)
         .lineTo(540, 88)
         .stroke();

      // Render 33 KPIs in a dense 3-column table
      doc.fillColor(COLORS.textDark)
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('All Performance Metrics (KPI #33)', 50, 105);

      // KPI Table Headers
      let tableY = 125;
      doc.rect(50, tableY, 490, 18).fill(COLORS.primary);
      doc.fillColor(COLORS.textLight).font('Helvetica-Bold').fontSize(8.5);
      doc.text('Metric Name', 60, tableY + 5);
      doc.text('Calculated Value', 290, tableY + 5);
      doc.text('Benchmark Alignment', 420, tableY + 5);

      tableY += 18;

      METRICS_REGISTRY.forEach((entry, idx) => {
        // Prevent layout overflow - split KPIs into columns or let them add page
        if (tableY > doc.page.height - 180) {
          doc.addPage();
          tableY = 50;
          doc.rect(50, tableY, 490, 18).fill(COLORS.primary);
          doc.fillColor(COLORS.textLight).font('Helvetica-Bold').fontSize(8.5);
          doc.text('Metric Name', 60, tableY + 5);
          doc.text('Calculated Value', 290, tableY + 5);
          doc.text('Benchmark Alignment', 420, tableY + 5);
          tableY += 18;
        }

        // Alternating background
        if (idx % 2 === 0) {
          doc.rect(50, tableY, 490, 15).fill(COLORS.bgLight);
        }

        const rawVal = entry.compute(project);
        
        let valStr = 'N/A';
        let isSensitive = [
          'noi', 'cap_rate', 'cash_on_cash', 'irr', 'dscr', 'ltv', 'oer', 'grm', 'roi', 'annual_cash_flow', 'capex', 'goi'
        ].includes(entry.id);

        if (rawVal !== null && !isNaN(rawVal)) {
          if (!isPremium && isSensitive) {
            valStr = '[Locked]';
          } else if (entry.unit === 'currency') {
            valStr = fmtUSD(rawVal);
          } else if (entry.unit === 'percent') {
            valStr = `${rawVal.toFixed(2)}%`;
          } else if (entry.unit === 'ratio') {
            valStr = rawVal.toFixed(2);
          } else {
            valStr = String(rawVal);
          }
        }

        let benchText = 'Aligned';
        const dotColor = getBenchmarkColor(entry, rawVal);
        if (dotColor === COLORS.danger) benchText = 'Action Needed';
        else if (dotColor === COLORS.warning) benchText = 'Warning Threshold';

        doc.fillColor(COLORS.textDark).font('Helvetica').fontSize(8);
        doc.text(entry.name, 60, tableY + 3.5);
        doc.font('Courier').text(valStr, 290, tableY + 3.5);
        
        // Dot indicator inside row
        doc.circle(425, tableY + 7.5, 3.5).fill(dotColor);
        doc.fillColor(COLORS.textMuted).font('Helvetica').fontSize(7.5).text(benchText, 435, tableY + 3.5);

        tableY += 15;
      });

      // Recent Transactions table (last 30 days)
      const projectTxs = transactions.filter(t => t.projectId === project.id).slice(0, 5);
      if (projectTxs.length > 0) {
        tableY += 15;
        doc.fillColor(COLORS.textDark).font('Helvetica-Bold').fontSize(11).text('Recent Project Transactions (Last 30 Days)', 50, tableY);
        tableY += 15;

        doc.rect(50, tableY, 490, 16).fill(COLORS.secondary);
        doc.fillColor(COLORS.textLight).font('Helvetica-Bold').fontSize(8);
        doc.text('Date', 60, tableY + 4);
        doc.text('Description', 140, tableY + 4);
        doc.text('Category', 340, tableY + 4);
        doc.text('Amount', 470, tableY + 4);
        tableY += 16;

        projectTxs.forEach((tx, txIdx) => {
          if (txIdx % 2 === 0) {
            doc.rect(50, tableY, 490, 14).fill(COLORS.bgLight);
          }

          const txAmt = Number(tx.amount) / 100;
          const displayAmt = isPremium ? fmtUSD(txAmt) : '[Locked]';
          const displayDesc = isPremium ? (tx.merchantName || tx.description || 'Unknown') : 'Confidential Merchant';

          doc.fillColor(COLORS.textDark).font('Helvetica').fontSize(7.5);
          doc.text(new Date(tx.date).toLocaleDateString(), 60, tableY + 3);
          doc.text(displayDesc, 140, tableY + 3, { width: 190, ellipsis: true });
          doc.text(tx.reiCategory || tx.category || 'operating', 340, tableY + 3);
          doc.font('Courier').text(displayAmt, 470, tableY + 3);

          tableY += 14;
        });
      }

      // Notes section for manual annotations
      tableY += 20;
      doc.fillColor(COLORS.textDark).font('Helvetica-Bold').fontSize(10).text('Notes & Manual Annotations:', 50, tableY);
      doc.rect(50, tableY + 12, 490, 35)
         .strokeColor(COLORS.border)
         .lineWidth(1)
         .stroke();
    });

    // ────────────────────────────────────────────────────────────────────────
    // APPENDIX: TRANSACTION LEDGER
    // ────────────────────────────────────────────────────────────────────────
    doc.addPage();

    doc.fillColor(COLORS.textDark)
       .font('Helvetica-Bold')
       .fontSize(16)
       .text('Appendix: Transaction Ledger', 50, 50);

    doc.fillColor(COLORS.textMuted)
       .font('Helvetica')
       .fontSize(9)
       .text('All synced portfolio and property transactions recorded over the last 90 days.', 50, 68);

    doc.strokeColor(COLORS.border)
       .lineWidth(1)
       .moveTo(50, 80)
       .lineTo(540, 80)
       .stroke();

    let ledgerY = 95;
    doc.rect(50, ledgerY, 490, 16).fill(COLORS.primary);
    doc.fillColor(COLORS.textLight).font('Helvetica-Bold').fontSize(8);
    doc.text('Date', 60, ledgerY + 4);
    doc.text('Merchant / Description', 130, ledgerY + 4);
    doc.text('REI Category', 310, ledgerY + 4);
    doc.text('Amount', 470, ledgerY + 4);
    ledgerY += 16;

    transactions.forEach((tx, idx) => {
      if (ledgerY > doc.page.height - 80) {
        doc.addPage();
        ledgerY = 50;
        doc.rect(50, ledgerY, 490, 16).fill(COLORS.primary);
        doc.fillColor(COLORS.textLight).font('Helvetica-Bold').fontSize(8);
        doc.text('Date', 60, ledgerY + 4);
        doc.text('Merchant / Description', 130, ledgerY + 4);
        doc.text('REI Category', 310, ledgerY + 4);
        doc.text('Amount', 470, ledgerY + 4);
        ledgerY += 16;
      }

      if (idx % 2 === 0) {
        doc.rect(50, ledgerY, 490, 14).fill(COLORS.bgLight);
      }

      const txAmt = Number(tx.amount) / 100;
      const displayAmt = isPremium ? fmtUSD(txAmt) : '[Locked]';
      const displayDesc = isPremium ? (tx.merchantName || tx.description || 'Unknown') : 'Confidential Merchant';

      doc.fillColor(COLORS.textDark).font('Helvetica').fontSize(7.5);
      doc.text(new Date(tx.date).toLocaleDateString(), 60, ledgerY + 3);
      doc.text(displayDesc, 130, ledgerY + 3, { width: 170, ellipsis: true });
      doc.text(tx.reiCategory || 'operating', 310, ledgerY + 3);
      doc.font('Courier').text(displayAmt, 470, ledgerY + 3);

      ledgerY += 14;
    });

    // ────────────────────────────────────────────────────────────────────────
    // FOOTER AND PAGE NUMBER PRINTING
    // ────────────────────────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      
      // Skip cover page
      if (i === 0) continue;

      // Header
      doc.fillColor(COLORS.textMuted)
         .font('Helvetica-Bold')
         .fontSize(7.5)
         .text('PaperWorking Insights', 50, 20);

      doc.font('Helvetica')
         .text(new Date().toLocaleDateString(), 480, 20);

      doc.strokeColor(COLORS.border)
         .lineWidth(0.5)
         .moveTo(50, 30)
         .lineTo(540, 30)
         .stroke();

      // Footer
      doc.strokeColor(COLORS.border)
         .lineWidth(0.5)
         .moveTo(50, doc.page.height - 45)
         .lineTo(540, doc.page.height - 45)
         .stroke();

      doc.fillColor(COLORS.textMuted)
         .font('Helvetica')
         .fontSize(6.5)
         .text('Generated by PaperWorking. Confidential Portfolio Insights.', 50, doc.page.height - 35);

      doc.text('This report is for informational purposes only and does not constitute financial advice.', 50, doc.page.height - 25);

      const pageStr = `Page ${i + 1} of ${range.count}`;
      doc.text(pageStr, 480, doc.page.height - 35);
    }

    doc.end();
  });
}
