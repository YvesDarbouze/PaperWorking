import { redirect } from 'next/navigation';

/**
 * /register is no longer a standalone page.
 * New users sign up via Google / Facebook / Magic Link on /login,
 * or create an account from the post-checkout success page.
 */
export default function RegisterPage() {
  redirect('/login');
}
