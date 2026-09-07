import type { Metadata } from 'next';
import ForgotPasswordPanel from '@/components/auth/ForgotPasswordPanel';

export const metadata: Metadata = {
  title: 'Reset Password',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPanel />;
}
