import { NextResponse } from 'next/server';
import { getChangelogEntries } from '@/lib/help/loader';

export const dynamic = 'force-dynamic';

export async function GET() {
  const entries = getChangelogEntries();

  const siteUrl = 'https://paperworking.com';

  const rssItems = entries
    .map((entry) => {
      // Escape XML characters
      const escapedTitle = entry.title
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      const escapedContent = entry.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return `
    <item>
      <title>${escapedTitle}</title>
      <link>${siteUrl}/changelog#v${entry.version}</link>
      <guid>${siteUrl}/changelog#v${entry.version}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <description>${escapedContent}</description>
    </item>`;
    })
    .join('');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PaperWorking Changelog</title>
    <link>${siteUrl}/changelog</link>
    <description>Latest product updates, improvements, and fixes for PaperWorking.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/changelog/rss" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}
