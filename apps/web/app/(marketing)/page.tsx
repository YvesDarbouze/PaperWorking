import { redirect } from 'next/navigation';

/** App entry: open Portfolio (sidebar) instead of marketing landing. */
export default function RootPage() {
  redirect('/dashboard');
}
