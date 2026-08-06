import fs from 'fs';
import path from 'path';
import { SUPPORT_ARTICLES, SUPPORT_CATEGORIES, SUPPORT_FAQS } from '../src/lib/cms/supportData';
import { GLOSSARY_TERMS } from '../src/lib/cms/glossaryData';
import { FAQ_ITEMS } from '../src/lib/cms/faqData';

export interface SearchDocument {
  id: string;
  type: 'article' | 'glossary' | 'metric' | 'faq';
  title: string;
  category: string;
  excerpt: string;
  content: string;
  tags: string[];
  route: string;
}

// Canonical 10 metrics + extra playbook metrics
const METRICS_LIST = [
  { id: 'noi', name: 'Net Operating Income (NOI)', category: 'Financial Performance', formula: 'Revenue - Operating Expenses', measures: 'Operational profitability excluding debt', whyTracks: 'Scans incoming management statements, utility bills, and tax assessments to calculate real-time operating profit.' },
  { id: 'cap-rate', name: 'Capitalization Rate (Cap Rate)', category: 'Financial Performance', formula: '(NOI / Property Value) * 100', measures: 'Asset yield based on all-cash purchase', whyTracks: 'Surfaces cap rates across entire portfolio to spot underperforming assets.' },
  { id: 'coc', name: 'Cash-on-Cash Return', category: 'Financial Performance', formula: '(Annual Cash Flow / Total Cash Invested) * 100', measures: 'Actual cash yield earned on out-of-pocket equity', whyTracks: 'Cross-references closing documents with net cash distributions to show out-of-pocket equity yield.' },
  { id: 'irr', name: 'Internal Rate of Return (IRR)', category: 'Financial Performance', formula: 'Discount rate where NPV equals zero', measures: 'Total annualized profitability adjusting for time value of money', whyTracks: 'Aggregates historic inflows, capital improvements, and projected exit numbers.' },
  { id: 'cash-flow', name: 'Cash Flow', category: 'Financial Performance', formula: 'Total Income - Total Expenses', measures: 'Literal liquidity moving through property', whyTracks: 'Tracks everyday liquidity and warns of near-term cash crunches or safe surplus.' },
  { id: 'grm', name: 'Gross Rent Multiplier (GRM)', category: 'Financial Performance', formula: 'Property Price / Gross Annual Rent', measures: 'Quick filter for years of gross revenue to pay for asset', whyTracks: 'Evaluates prospective acquisitions against target rent rolls.' },
  { id: 'dscr', name: 'Debt Service Coverage Ratio (DSCR)', category: 'Financial Performance', formula: 'NOI / Total Debt Service', measures: 'Structural ability to cover mortgage obligations', whyTracks: 'Monitors buffer to prove properties clear lender covenants.' },
  { id: 'ltv', name: 'Loan-to-Value (LTV) Ratio', category: 'Financial Performance', formula: '(Loan Amount / Property Value) * 100', measures: 'Leverage profile comparing debt to market value', whyTracks: 'Monitors amortizing loan balances against asset valuations.' },
  { id: 'oer', name: 'Operating Expense Ratio (OER)', category: 'Financial Performance', formula: '(Operating Expenses / Gross Operating Income) * 100', measures: 'Slice of revenue eaten by daily operational upkeep', whyTracks: 'Flags line-item expenses that trend higher than baseline.' },
  { id: 'occupancy', name: 'Occupancy Rate', category: 'Operational Efficiency', formula: '(Occupied Units / Total Units) * 100', measures: 'Physical space utilization efficiency', whyTracks: 'References active lease agreements to compute live portfolio occupancy.' },
  { id: 'appreciation', name: 'Long-Term Appreciation', category: 'Asset & Portfolio', formula: 'Portfolio Value Growth', measures: 'Compounded wealth appreciation over time', whyTracks: 'Displays aggregate wealth growth driven by market tailwinds and value-add execution.' },
];

export function generateSupportIndex(): SearchDocument[] {
  const documents: SearchDocument[] = [];

  // 1. Articles (~26 articles)
  SUPPORT_ARTICLES.forEach((article) => {
    const cat = SUPPORT_CATEGORIES.find((c) => c.id === article.categoryId);
    documents.push({
      id: `article-${article.id}`,
      type: 'article',
      title: article.title,
      category: cat?.title ?? 'Knowledge Base',
      excerpt: article.excerpt,
      content: `${article.title} ${article.excerpt} ${(article.tags ?? []).join(' ')} ${article.content ?? ''}`,
      tags: article.tags ?? [],
      route: `/support/${article.id}`,
    });
  });

  // 2. Glossary Terms
  GLOSSARY_TERMS.forEach((term) => {
    const termSlug = term.term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    documents.push({
      id: `glossary-${termSlug}`,
      type: 'glossary',
      title: term.term,
      category: 'Real Estate Glossary',
      excerpt: term.definition,
      content: `${term.term} ${term.definition} ${(term.relatedTerms ?? []).join(' ')}`,
      tags: term.relatedTerms ?? [],
      route: `/support/glossary#${termSlug}`,
    });
  });

  // 3. Metrics
  METRICS_LIST.forEach((metric) => {
    documents.push({
      id: `metric-${metric.id}`,
      type: 'metric',
      title: metric.name,
      category: 'Metrics Playbook',
      excerpt: `${metric.measures} Formula: ${metric.formula}`,
      content: `${metric.name} ${metric.formula} ${metric.measures} ${metric.whyTracks}`,
      tags: [metric.id, 'metric', 'kpi', 'playbook'],
      route: `/support/metrics#${metric.id}`,
    });
  });

  // 4. FAQs
  const allFaqs = [...SUPPORT_FAQS, ...FAQ_ITEMS];
  const seenFaqQuestions = new Set<string>();

  allFaqs.forEach((faq, index) => {
    if (seenFaqQuestions.has(faq.question.toLowerCase())) return;
    seenFaqQuestions.add(faq.question.toLowerCase());

    documents.push({
      id: `faq-${index}`,
      type: 'faq',
      title: faq.question,
      category: 'Frequently Asked Questions',
      excerpt: faq.answer,
      content: `${faq.question} ${faq.answer}`,
      tags: ['faq', 'question', 'answer'],
      route: `/support#faq`,
    });
  });

  return documents;
}

// Write file when executed directly
if (require.main === module) {
  const indexDocs = generateSupportIndex();
  const targetDir = path.resolve(__dirname, '../src/lib/search');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetPath = path.resolve(targetDir, 'supportIndex.json');
  fs.writeFileSync(targetPath, JSON.stringify(indexDocs, null, 2), 'utf8');
  console.log(`[buildSupportIndex] Successfully compiled ${indexDocs.length} search documents to ${targetPath}`);
}
