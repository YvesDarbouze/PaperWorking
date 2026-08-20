import { redirect } from 'next/navigation';

export default async function RegisterRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') params.set(key, value);
    else if (Array.isArray(value)) value.forEach((entry) => params.append(key, entry));
  }

  const suffix = params.toString();
  redirect(suffix ? `/signup?${suffix}` : '/signup');
}
