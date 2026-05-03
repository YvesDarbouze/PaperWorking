/**
 * Produces a compact chart axis label for a project.
 *
 * Priority order:
 *   1. projectAlias — reserved for a future schema field; checked first so adding
 *      it to the schema immediately activates it without touching this logic.
 *   2. Street name + type derived from address (strips house number and city portion).
 *      "123 Main St, Miami FL 33101" → "Main St"
 *   3. propertyName as a last resort.
 */
export function formatChartLabel(project: {
  address: string;
  propertyName: string;
  projectAlias?: string;
}): string {
  if (project.projectAlias?.trim()) return project.projectAlias.trim();

  const street = project.address
    .split(',')[0]          // drop city / state / zip
    .replace(/^\d+\s+/, '') // drop leading house number ("123 ")
    .trim();

  return street || project.propertyName;
}
