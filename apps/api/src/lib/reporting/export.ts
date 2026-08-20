export const EXPORT_FORMATS = ['csv', 'pdf', 'json'] as const;
export const EXPORT_TYPES = ['pl', 'cashflow', 'balance'] as const;

export function validateReportingExportBody(body: {
  format?: unknown;
  type?: unknown;
  projectIds?: unknown;
}): { ok: true; format: string; type: string; projectIds: string[] } | { ok: false; error: string; status: number } {
  const format = typeof body.format === 'string' ? body.format : '';
  const type = typeof body.type === 'string' ? body.type : '';
  if (!format || !type || !Array.isArray(body.projectIds) || body.projectIds.length === 0) {
    return {
      ok: false,
      error: 'Missing required fields: format, type, projectIds (non-empty array)',
      status: 400,
    };
  }
  if (!(EXPORT_FORMATS as readonly string[]).includes(format)) {
    return { ok: false, error: 'Invalid format', status: 400 };
  }
  if (!(EXPORT_TYPES as readonly string[]).includes(type)) {
    return { ok: false, error: 'Invalid type', status: 400 };
  }
  const projectIds = body.projectIds.filter((id): id is string => typeof id === 'string' && !!id);
  if (projectIds.length === 0) {
    return { ok: false, error: 'projectIds must be an array of non-empty strings', status: 400 };
  }
  return { ok: true, format, type, projectIds };
}

export function fmtExportDollar(val: number): string {
  const neg = val < 0;
  return `${neg ? '-' : ''}$${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function rowsToCsv(dataRows: string[][]): string {
  return dataRows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}
