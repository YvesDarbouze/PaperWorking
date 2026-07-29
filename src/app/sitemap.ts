import { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.com';

  // Static routes
  const staticRoutes = [
    '',
    '/about',
    '/careers',
    '/changelog',
    '/contact',
    '/cookies',
    '/faq',
    '/how-it-works',
    '/pricing',
    '/privacy',
    '/search',
    '/terms',
    '/trust',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Query published PUBLIC_SOLICITED deals from Firestore
  let dealRoutes: MetadataRoute.Sitemap = [];
  try {
    const listingsSnap = await adminDb
      .collection('dealListings')
      .where('status', '==', 'published')
      .where('visibilityMode', '==', 'PUBLIC_SOLICITED')
      .get();

    dealRoutes = listingsSnap.docs.map((doc) => {
      const data = doc.data();
      const updatedAt = data.updatedAt
        ? new Date(data.updatedAt)
        : new Date();
      return {
        url: `${baseUrl}/deals/${doc.id}`,
        lastModified: updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      };
    });
  } catch (error) {
    console.error('[Sitemap] Failed to query published deals:', error);
  }

  return [...staticRoutes, ...dealRoutes];
}
