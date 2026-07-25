import { Metadata } from 'next';
import { adminDb } from '@/lib/firebase/admin';

interface Props {
  params: Promise<{ listingId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ listingId: string }> }): Promise<Metadata> {
  const { listingId } = await params;
  try {
    const snap = await adminDb.collection('dealListings').doc(listingId).get();
    if (snap.exists) {
      const listing = snap.data();
      // Only PUBLIC_SOLICITED deals are indexable
      if (listing?.status === 'published' && listing?.visibilityMode === 'PUBLIC_SOLICITED') {
        return {
          title: `${listing.propertyName || 'Deal Listing'} | PaperWorking`,
          description: `${listing.propertyName || 'Deal'} in ${listing.neighborhood || 'neighborhood'} is listed on PaperWorking.`,
          robots: {
            index: true,
            follow: true,
          },
        };
      }
    }
  } catch (error) {
    console.error('[Deal Layout] Failed to generate metadata:', error);
  }

  // Exclude MARKETPLACE, PRIVATE, and non-existing deals from search indices entirely (G-6)
  return {
    title: 'Deal Listing | PaperWorking',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function DealLayout({ children }: Props) {
  return <>{children}</>;
}
