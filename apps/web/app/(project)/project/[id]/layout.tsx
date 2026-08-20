import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProjectWorkspaceProvider from '@/components/projects/ProjectWorkspaceProvider';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';

export const metadata: Metadata = {
  title: 'Project Workspace',
  robots: 'noindex, nofollow',
};

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE)?.value) {
    redirect('/login');
  }

  const { id } = await params;
  return <ProjectWorkspaceProvider projectId={id}>{children}</ProjectWorkspaceProvider>;
}
