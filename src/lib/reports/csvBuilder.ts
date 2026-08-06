import { METRICS_REGISTRY } from '@/lib/metrics/metricRegistry';

function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generatePortfolioCSV(projects: any[], isPremium: boolean): string {
  const headers = ['Project Address', 'Phase', ...METRICS_REGISTRY.map(m => m.name)];
  const rows: string[][] = [headers];

  projects.forEach(project => {
    const row: string[] = [
      project.propertyName || project.address || 'Unnamed Project',
      project.phase || project.status || 'unknown'
    ];

    METRICS_REGISTRY.forEach(entry => {
      const rawVal = entry.compute(project);

      // Respect paywall: strip/obfuscate sensitive metrics for non-subscribers.
      // This is checked BEFORE the null branch on purpose — emitting "N/A" for a
      // locked metric would tell a non-subscriber whether data exists, and the
      // registry now returns null (not 0) whenever inputs are missing, so the
      // old ordering silently stopped locking anything on sparse portfolios.
      const isSensitive = [
        'noi', 'cap_rate', 'cash_on_cash', 'irr', 'dscr', 'ltv', 'oer', 'grm', 'roi', 'annual_cash_flow', 'capex', 'goi'
      ].includes(entry.id);

      if (isSensitive && !isPremium) {
        row.push('[Locked]');
        return;
      }

      if (rawVal === null || rawVal === undefined || isNaN(rawVal)) {
        row.push('N/A');
        return;
      }

      // Format based on unit
      if (entry.unit === 'currency') {
        row.push(rawVal.toFixed(2));
      } else if (entry.unit === 'percent') {
        row.push(`${rawVal.toFixed(2)}%`);
      } else if (entry.unit === 'ratio') {
        row.push(rawVal.toFixed(2));
      } else {
        row.push(String(rawVal));
      }
    });

    rows.push(row.map(escapeCSVValue));
  });

  return rows.map(r => r.join(',')).join('\n');
}

export function generateTransactionCSV(transactions: any[], isPremium: boolean): string {
  const headers = ['Date', 'Merchant Name', 'Category', 'REI Category', 'Amount', 'Project', 'Reviewed'];
  const rows: string[][] = [headers];

  transactions.forEach(t => {
    // Respect paywall: strip transaction details or amounts if not premium
    const amountVal = Number(t.amount) / 100; // stored as cents
    const formattedAmount = isPremium ? amountVal.toFixed(2) : '[Locked]';
    const merchant = isPremium ? (t.merchantName || t.description || 'Unknown') : 'Confidential Merchant';

    const row = [
      new Date(t.date).toISOString().split('T')[0],
      merchant,
      t.category || '',
      t.reiCategory || '',
      formattedAmount,
      t.project?.propertyName || t.projectId || '',
      t.reviewed ? 'Yes' : 'No'
    ];

    rows.push(row.map(escapeCSVValue));
  });

  return rows.map(r => r.join(',')).join('\n');
}
