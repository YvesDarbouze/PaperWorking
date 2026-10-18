export function filterProjectsByQuery<
  T extends {
    propertyName?: string;
    address?: string;
    property_address?: string;
    city?: string;
    purchasePrice?: number | string;
    purchase_price?: number | string;
    status?: string;
    currentPhase?: string;
  },
>(projects: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return projects;
  const qNumeric = q.replace(/[$,\s]/g, '');
  return projects.filter((p) => {
    const priceVal = p.purchasePrice ?? p.purchase_price;
    const priceStr = priceVal !== undefined && priceVal !== null ? String(priceVal) : '';
    return (
      (p.propertyName && p.propertyName.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q)) ||
      (p.property_address && p.property_address.toLowerCase().includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q)) ||
      (priceStr && priceStr.toLowerCase().includes(q)) ||
      (qNumeric.length > 0 && priceStr.includes(qNumeric)) ||
      (p.status && p.status.toLowerCase().includes(q)) ||
      (p.currentPhase && p.currentPhase.toLowerCase().includes(q))
    );
  });
}

export function validateProjectsListQuery(orgId: string | null | undefined): {
  ok: true;
  organizationId: string | null;
} {
  return { ok: true, organizationId: orgId?.trim() || null };
}
