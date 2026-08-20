import ProjectDocumentsPanel from '@/components/projects/ProjectDocumentsPanel';

export default async function ProjectDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDocumentsPanel projectId={id} />;
}
