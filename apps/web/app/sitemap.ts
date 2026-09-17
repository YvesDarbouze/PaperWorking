import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://paperworking.co';
  const routes = [
    '',
    '/deal-calculator',
    '/how-it-works',
    '/pricing',
    '/marketplace',
    '/support',
    '/support/glossary',
    '/support/metrics',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : route === '/deal-calculator' ? 0.9 : 0.8,
  }));
}
