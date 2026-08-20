export function filterProjectsByQuery<T extends { propertyName?: string; address?: string }>(
  projects: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return projects;
  return projects.filter(
    (p) =>
      (p.propertyName && p.propertyName.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q)),
  );
}

export function validateProjectsListQuery(orgId: string | null | undefined): {
  ok: true;
  organizationId: string | null;
} {
  return { ok: true, organizationId: orgId?.trim() || null };
}
