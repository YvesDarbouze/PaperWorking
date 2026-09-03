import DealDetailPanel from '@/components/marketplace/DealDetailPanel';

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DealDetailPanel slug={slug} />;
}
