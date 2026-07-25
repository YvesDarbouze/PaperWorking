import { getPublicListing } from '@/actions/listings';
import DealListingClientPage from './DealListingClientPage';

interface Props {
  params: Promise<{ listingId: string }>;
}

export default async function DealListingPage({ params }: Props) {
  const { listingId } = await params;
  let initialTeaser = null;
  try {
    initialTeaser = await getPublicListing(listingId);
  } catch (error) {
    // If a Vendor or other error occurs, initialTeaser remains null, prompting NotFound / redirect
    console.warn('[DealPage] Server-side fetch initial teaser failed:', error);
  }

  return <DealListingClientPage listingId={listingId} initialTeaser={initialTeaser} />;
}
