import { redirect } from 'next/navigation';

/** Alias kept for older links; marketing home is `/`. */
export default function MarketingHomePage() {
  redirect('/');
}
