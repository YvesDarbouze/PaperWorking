import { HELP_ARTICLES, getHelpArticle } from '../../lib/marketing/help-data.js';
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '../../lib/marketing/legal-data.js';
import { FOOTER_COLUMNS } from '../../lib/marketing/content.js';

describe('phase 7d — legal & help pages', () => {
  it('defines privacy and terms sections', () => {
    expect(PRIVACY_SECTIONS.length).toBeGreaterThanOrEqual(5);
    expect(TERMS_SECTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it('provides help articles with resolvable slugs', () => {
    expect(HELP_ARTICLES.length).toBeGreaterThanOrEqual(4);
    for (const article of HELP_ARTICLES) {
      expect(getHelpArticle(article.slug)?.title).toBe(article.title);
    }
  });

  it('footer links target implemented marketing routes', () => {
    const hrefs = FOOTER_COLUMNS.flatMap((column) => column.links.map((link) => link.href));
    const implemented = new Set([
      '/how-it-works',
      '/marketplaces',
      '/pricing',
      '/changelog',
      '/support',
      '/support/glossary',
      '/support/metrics',
      '/help',
      '/login',
      '/signup',
      '/forgot-password',
      '/contact',
      '/privacy',
      '/terms',
    ]);
    for (const href of hrefs) {
      expect(implemented.has(href)).toBe(true);
    }
  });
});
