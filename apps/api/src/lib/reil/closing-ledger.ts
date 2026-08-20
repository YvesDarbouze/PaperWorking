export function csvEscape(v: string | number): string {
  const s = String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildClosingLedgerCsv(
  lines: Array<{ label: string; isOverridden: boolean; computed: number; override?: number; amount: number }>,
  total: number,
  address: string,
  date: string,
): string {
  const rows: string[] = [
    `"Closing Ledger — ${address}"`,
    `"Generated","${date}"`,
    '',
    '"Line Item","Type","Computed ($)","Override ($)","Amount ($)"',
  ];
  for (const line of lines) {
    rows.push(
      [
        csvEscape(line.label),
        csvEscape(line.isOverridden ? 'Overridden' : 'Computed'),
        csvEscape(line.computed.toFixed(2)),
        csvEscape(line.isOverridden && line.override !== undefined ? line.override.toFixed(2) : ''),
        csvEscape(line.amount.toFixed(2)),
      ].join(','),
    );
  }
  rows.push('', `"","","","TOTAL",${csvEscape(total.toFixed(2))}`);
  return rows.join('\r\n');
}

export function buildClosingLedgerBasename(address: string, projectId: string, dateStr: string): string {
  const slug = (address || projectId)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  return `closing-ledger-${slug}-${dateStr}`;
}
