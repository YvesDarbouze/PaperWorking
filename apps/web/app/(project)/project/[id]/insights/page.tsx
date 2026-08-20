import ProjectInsightsPanel from '@/components/insights/ProjectInsightsPanel';

export default async function ProjectInsightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectInsightsPanel projectId={id} />;
}
