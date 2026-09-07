/** Shallow-merge financials patch into existing project.financials object. */
export function mergeProjectFinancials(
  existing: Record<string, unknown> | undefined | null,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(existing && typeof existing === 'object' ? existing : {}), ...patch };
}
