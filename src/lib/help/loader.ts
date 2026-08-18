import fs from 'fs';
import path from 'path';

export interface HelpArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: 'screens' | 'metrics';
  content: string; // Compiled HTML
  rawContent: string; // Raw Markdown
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  content: string; // Compiled HTML
  rawContent: string; // Raw Markdown
}

/**
 * A basic, robust, dependency-free Markdown to HTML parser
 */
export function compileMarkdown(markdown: string): string {
  // 1. Remove YAML frontmatter if present
  let html = markdown.replace(/^---[\s\S]*?---/, '');

  // 2. Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold tracking-tight text-[var(--pw-black)] mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold tracking-tight text-[var(--pw-black)] mt-8 mb-4">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold tracking-tight text-[var(--pw-black)] mt-10 mb-6">$1</h1>');

  // 3. Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 4. Code Blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-black/40 text-[#6E7480] p-4 rounded-lg my-4 font-mono text-xs overflow-x-auto">$1</pre>');

  // 5. Inline Code
  html = html.replace(/`(.*?)`/g, '<code class="bg-black/30 text-[#8a8e9a] px-1 py-0.5 rounded font-mono text-xs">$1</code>');

  // 6. Lists (unordered)
  const lines = html.split('\n');
  let inList = false;
  const processedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        processedLines.push('<ul class="list-disc pl-5 my-4 space-y-2 text-on-surface-variant">');
        inList = true;
      }
      processedLines.push(`<li class="text-sm">${trimmed.substring(2)}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  }
  if (inList) {
    processedLines.push('</ul>');
  }
  html = processedLines.join('\n');

  // 7. Paragraphs (split by double line breaks)
  const paragraphs = html.split(/\n\s*\n/).map((p) => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    // Skip wrapping already wrapped block elements
    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<li') ||
      trimmed.startsWith('</ul') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('</pre')
    ) {
      return trimmed;
    }
    return `<p class="my-4 text-on-surface-variant leading-relaxed text-sm">${trimmed}</p>`;
  });

  return paragraphs.filter(Boolean).join('\n');
}

/**
 * Parses simple frontmatter out of an MD/MDX file string
 */
function parseFrontmatter(fileContent: string): { data: Record<string, string>; content: string } {
  const match = fileContent.match(/^---([\s\S]*?)---/);
  const data: Record<string, string> = {};
  let content = fileContent;

  if (match) {
    content = fileContent.substring(match[0].length);
    const yaml = match[1];
    const lines = yaml.split('\n');
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        // Remove surrounding quotes if present
        data[key] = value.replace(/^['"](.*)['"]$/, '$1');
      }
    }
  }

  return { data, content };
}

/**
 * Gets all Help center articles
 */
export function getHelpArticles(): HelpArticle[] {
  const articles: HelpArticle[] = [];
  const contentRoot = path.join(process.cwd(), 'content/help');

  const categories: Array<'screens' | 'metrics'> = ['screens', 'metrics'];

  for (const cat of categories) {
    const catDir = path.join(contentRoot, cat);
    if (!fs.existsSync(catDir)) continue;

    const files = fs.readdirSync(catDir);
    for (const file of files) {
      if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;

      const filePath = path.join(catDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = parseFrontmatter(fileContent);

      articles.push({
        slug: data.slug || path.basename(file, path.extname(file)),
        title: data.title || 'Untitled Article',
        excerpt: data.excerpt || '',
        category: cat,
        content: compileMarkdown(content),
        rawContent: fileContent,
      });
    }
  }

  return articles;
}

/**
 * Gets a specific article by slug
 */
export function getHelpArticleBySlug(slug: string): HelpArticle | null {
  const articles = getHelpArticles();
  return articles.find((a) => a.slug === slug) || null;
}

/**
 * Search articles by query
 */
export function searchHelpArticles(query: string): HelpArticle[] {
  const articles = getHelpArticles();
  if (!query) return articles;

  const normalizedQuery = query.toLowerCase().trim();

  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(normalizedQuery) ||
      a.excerpt.toLowerCase().includes(normalizedQuery) ||
      a.slug.toLowerCase().includes(normalizedQuery) ||
      a.rawContent.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Gets all changelog entries sorted reverse-chronologically
 */
export function getChangelogEntries(): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const changelogDir = path.join(process.cwd(), 'content/changelog');

  if (!fs.existsSync(changelogDir)) return [];

  const files = fs.readdirSync(changelogDir);
  for (const file of files) {
    if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;

    const filePath = path.join(changelogDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = parseFrontmatter(fileContent);

    entries.push({
      version: data.version || '',
      date: data.date || '',
      title: data.title || 'Version Release',
      content: compileMarkdown(content),
      rawContent: fileContent,
    });
  }

  // Sort by date descending
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}
