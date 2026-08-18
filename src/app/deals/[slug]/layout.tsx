import { Metadata } from 'next';
import { adminDb } from '@/lib/firebase/admin';

interface _Props {
  params: Promise<{ slug?: string; listingId?: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string; listingId?: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const dealId = resolvedParams.slug || resolvedParams.listingId || '';

  try {
    const docSnap = await adminDb.collection('dealListings').doc(dealId).get();
    const dealData = docSnap.exists ? docSnap.data() : null;

    if (!dealData) {
      return {
        title: 'Deal | PaperWorking',
        robots: { index: false, follow: false },
      };
    }

    const isPublic = dealData.status === 'published' && dealData.visibilityMode === 'PUBLIC_SOLICITED';

    return {
      title: `${dealData.propertyName || 'Deal'} | PaperWorking`,
      description: dealData.neighborhood ? `Real estate deal in ${dealData.neighborhood}` : 'PaperWorking Deal',
      robots: {
        index: isPublic,
        follow: isPublic,
      },
    };
  } catch {
    return {
      title: 'Deal | PaperWorking',
      robots: { index: false, follow: false },
    };
  }
}

export default function DealLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
