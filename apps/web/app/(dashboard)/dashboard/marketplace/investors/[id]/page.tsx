import InvestorProfilePanel from '@/components/marketplace/InvestorProfilePanel';

export default async function InvestorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvestorProfilePanel investorId={id} />;
}
