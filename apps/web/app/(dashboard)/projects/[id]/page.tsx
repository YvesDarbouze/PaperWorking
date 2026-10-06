import { redirect } from 'next/navigation';

export default async function ProjectsIdRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp || {})) {
    if (typeof v === 'string') {
      query.set(k, v);
    } else if (Array.isArray(v)) {
      v.forEach((val) => query.append(k, val));
    }
  }
  const queryString = query.toString() ? `?${query.toString()}` : '';
  redirect(`/project/${id}${queryString}`);
}
