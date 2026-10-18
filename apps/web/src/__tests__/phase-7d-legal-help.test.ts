import { HELP_ARTICLES, getHelpArticle } from '../../lib/marketing/help-data.js';
import { BLOG_POSTS, getBlogPost } from '../../lib/marketing/blog-data.js';
import { COOKIE_SECTIONS, PRIVACY_SECTIONS, TERMS_SECTIONS } from '../../lib/marketing/legal-data.js';
import { FOOTER_BOTTOM_LINKS, FOOTER_COLUMNS } from '../../lib/marketing/content.js';

describe('phase 7d - legal, help, and blog pages', () => {
  it('defines privacy, terms, and cookie sections', () => {
    expect(PRIVACY_SECTIONS.length).toBeGreaterThanOrEqual(5);
    expect(TERMS_SECTIONS.length).toBeGreaterThanOrEqual(5);
    expect(COOKIE_SECTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it('provides help articles with resolvable slugs', () => {
    expect(HELP_ARTICLES.length).toBeGreaterThanOrEqual(4);
    for (const article of HELP_ARTICLES) {
      expect(getHelpArticle(article.slug)?.title).toBe(article.title);
    }
  });

  it('Bug_36: provides blog posts with resolvable slugs and routes footer Blog link to /blog instead of /help', () => {
    expect(BLOG_POSTS.length).toBeGreaterThanOrEqual(4);
    for (const post of BLOG_POSTS) {
      expect(getBlogPost(post.slug)?.title).toBe(post.title);
      expect(post.sections.length).toBeGreaterThanOrEqual(2);
    }

    const resourcesColumn = FOOTER_COLUMNS.find((col) => col.heading === 'Resources');
    const blogLink = resourcesColumn?.links.find((link) => link.label === 'Blog');
    expect(blogLink).toBeDefined();
    expect(blogLink?.href).toBe('/blog');
    expect(blogLink?.href).not.toBe('/help');
  });

  it('Bug_37: routes footer Cookies links to /cookies instead of /privacy', () => {
    const legalColumn = FOOTER_COLUMNS.find((col) => col.heading === 'Company & Legal');
    const columnCookiesLink = legalColumn?.links.find((link) => link.label === 'Cookies');
    expect(columnCookiesLink).toBeDefined();
    expect(columnCookiesLink?.href).toBe('/cookies');
    expect(columnCookiesLink?.href).not.toBe('/privacy');

    const bottomCookiesLink = FOOTER_BOTTOM_LINKS.find((link) => link.label === 'Cookies');
    expect(bottomCookiesLink).toBeDefined();
    expect(bottomCookiesLink?.href).toBe('/cookies');
    expect(bottomCookiesLink?.href).not.toBe('/privacy');
  });

  it('Bug_71: routes footer About, Careers, and Cookies links to /about, /careers, and /cookies instead of /contact', () => {
    const legalColumn = FOOTER_COLUMNS.find((col) => col.heading === 'Company & Legal');
    const aboutLink = legalColumn?.links.find((link) => link.label === 'About');
    const careersLink = legalColumn?.links.find((link) => link.label === 'Careers');
    const cookiesLink = legalColumn?.links.find((link) => link.label === 'Cookies');

    expect(aboutLink?.href).toBe('/about');
    expect(aboutLink?.href).not.toBe('/contact');
    expect(careersLink?.href).toBe('/careers');
    expect(careersLink?.href).not.toBe('/contact');
    expect(cookiesLink?.href).toBe('/cookies');
    expect(cookiesLink?.href).not.toBe('/contact');
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
      '/blog',
      '/login',
      '/signup',
      '/forgot-password',
      '/invite',
      '/about',
      '/careers',
      '/contact',
      '/about',
      '/careers',
      '/privacy',
      '/terms',
      '/cookies',
      '/subprocessors',
    ]);
    for (const href of hrefs) {
      expect(implemented.has(href)).toBe(true);
    }
  });
});
