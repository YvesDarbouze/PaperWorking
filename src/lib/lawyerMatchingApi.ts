import { ApplicationUser } from '@/types/schema';

export async function fetchStateMatchedLawyers(stateCode: string): Promise<ApplicationUser[]> {
  const res = await fetch(`/api/lawyers?state=${encodeURIComponent(stateCode)}`);
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.success) return [];
  return data.lawyers as ApplicationUser[];
}
