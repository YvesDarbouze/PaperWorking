import ProjectScorecardPanel from '@/components/insights/ProjectScorecardPanel';

export default async function ProjectScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectScorecardPanel projectId={id} />;
}
