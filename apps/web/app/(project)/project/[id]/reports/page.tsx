import ProjectReportsPanel from '@/components/reports/ProjectReportsPanel';

export default async function ProjectReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectReportsPanel projectId={id} />;
}
