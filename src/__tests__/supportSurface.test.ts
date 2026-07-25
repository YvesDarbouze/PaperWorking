import { compileMarkdown, getHelpArticles, getHelpArticleBySlug, searchHelpArticles, getChangelogEntries } from '../lib/help/loader';

describe('Support Surface - Help Center Loader & Search', () => {
  test('compileMarkdown converts markdown elements to HTML', () => {
    const rawMarkdown = `---
title: Test Title
category: screens
---
# Heading 1
## Heading 2
This is a **bold** statement with a \`code\` inline segment.

- List Item 1
- List Item 2

\`\`\`
code block
\`\`\`
`;
    const html = compileMarkdown(rawMarkdown);

    expect(html).toContain('<h1 class="text-2xl font-bold tracking-tight text-[var(--pw-black)] mt-10 mb-6">Heading 1</h1>');
    expect(html).toContain('<h2 class="text-xl font-bold tracking-tight text-[var(--pw-black)] mt-8 mb-4">Heading 2</h2>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code class="bg-black/30 text-[#8a8e9a] px-1 py-0.5 rounded font-mono text-xs">code</code>');
    expect(html).toContain('<ul class="list-disc pl-5 my-4 space-y-2 text-on-surface-variant">');
    expect(html).toContain('<li class="text-sm">List Item 1</li>');
    expect(html).toContain('<pre class="bg-black/40 text-[#6E7480] p-4 rounded-lg my-4 font-mono text-xs overflow-x-auto">');
  });

  test('getHelpArticles loads all articles', () => {
    const articles = getHelpArticles();
    expect(articles.length).toBeGreaterThanOrEqual(19); // 9 screens + 10 metrics

    const noi = articles.find(a => a.slug === 'noi');
    expect(noi).toBeDefined();
    expect(noi?.category).toBe('metrics');
    expect(noi?.title).toBe('NOI (Net Operating Income)');
  });

  test('getHelpArticleBySlug retrieves a single article by slug', () => {
    const article = getHelpArticleBySlug('noi');
    expect(article).not.toBeNull();
    expect(article?.slug).toBe('noi');
  });

  test('searchHelpArticles returns relevant articles matching query keywords', () => {
    // Search "NOI"
    const noiResults = searchHelpArticles('NOI');
    expect(noiResults.some(a => a.slug === 'noi')).toBe(true);

    // Search "Cash Flow"
    const cashFlowResults = searchHelpArticles('Cash Flow');
    expect(cashFlowResults.some(a => a.slug === 'cash-flow')).toBe(true);

    // Search "first project"
    const projectResults = searchHelpArticles('first project');
    expect(projectResults.some(a => a.slug === 'portfolio' || a.slug === 'projects')).toBe(true);
  });
});

describe('Changelog & RSS Feed', () => {
  test('getChangelogEntries loads and sorts entries reverse-chronologically', () => {
    const entries = getChangelogEntries();
    expect(entries.length).toBeGreaterThanOrEqual(2);
    
    // Check sorting: version 1.0.0 is newer than version 0.9.0
    const first = entries[0];
    const second = entries[1];
    expect(new Date(first.date).getTime()).toBeGreaterThanOrEqual(new Date(second.date).getTime());
    expect(first.version).toBe('1.0.0');
  });
});
