import { redirect } from 'next/navigation';

/** Legacy path — Portfolio now lives at `/dashboard`. */
export default function CommandCenterRedirectPage() {
  redirect('/dashboard');
}
