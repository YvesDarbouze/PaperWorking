import type { Metadata } from 'next';
import ProjectWorkspaceProvider from '@/components/projects/ProjectWorkspaceProvider';
import { requireServerAuthUser } from '@/lib/api/server-session';

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
  await requireServerAuthUser('/login');

  const { id } = await params;
  return <ProjectWorkspaceProvider projectId={id}>{children}</ProjectWorkspaceProvider>;
}
