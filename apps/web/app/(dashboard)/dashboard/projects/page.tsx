import { redirect } from 'next/navigation';

/** Legacy path — projects list now lives at `/projects`. */
export default function DashboardProjectsRedirectPage() {
  redirect('/projects');
}
