import { redirect } from 'next/navigation';

/* Settings index — redirect to Profile as the default section */
export default function SettingsPage() {
  redirect('/dashboard/settings/profile');
}
