export type BlogCategory = 'Flip Case Studies' | 'Tax Strategies' | 'Market Updates';

export interface BlogPost {
  title: string;
  slug: string;
  category: BlogCategory;
  date: string;
  readTime: string;
  excerpt: string;
  thumbnailUrl: string;
  author: {
    name: string;
    avatarUrl: string;
    role: string;
  };
  content: string; // HTML-like string or JSON
  caseStudyData?: {
    beforeImageUrl: string;
    afterImageUrl: string;
    formula: {
      purchasePrice: number;
      rehabCost: number;
      holdingCosts: number;
      salePrice: number;
      netProfit: number;
      roc: number; // Return on Capital
    };
  };
}

export const BLOG_POSTS: BlogPost[] = [
  {
    title: "The $142k Exit: Strategic Rehab in Nashville",
    slug: "nashville-strategic-rehab-exit",
    category: "Flip Case Studies",
    date: "April 12, 2024",
    readTime: "6 min",
    excerpt: "How we transformed a distressed duplex into a premium rental exit while managing 28% variance in materials costs.",
    thumbnailUrl: "https://images.unsplash.com/photo-1580587767303-9bbef3012173?auto=format&fit=crop&w=800&q=80",
    author: {
      name: "Marcus Thorne",
      avatarUrl: "https://i.pravatar.cc/150?u=marcus",
      role: "Lead Acquisitions"
    },
    content: "Detailed breakdown of the Nashville duplex transformation...",
    caseStudyData: {
      beforeImageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      afterImageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      formula: {
        purchasePrice: 285000,
        rehabCost: 95000,
        holdingCosts: 18000,
        salePrice: 540000,
        netProfit: 142000,
        roc: 37.4
      }
    }
  },
  {
    title: "1031 Exchange Strategies for Institutional Flippers",
    slug: "1031-exchange-strategies-2024",
    category: "Tax Strategies",
    date: "April 08, 2024",
    readTime: "12 min",
    excerpt: "Optimizing the replacement property timeline to defer capital gains tax while scaling your portfolio.",
    thumbnailUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80",
    author: {
      name: "Sarah Jenkins",
      avatarUrl: "https://i.pravatar.cc/150?u=sarah",
      role: "Tax Specialist"
    },
    content: "Deferring capital gains is the single most effective way to compound your portfolio growth..."
  },
  {
    title: "Q2 Housing Market: The Inventory Deficit Reality",
    slug: "q2-market-update-inventory-deficit",
    category: "Market Updates",
    date: "April 05, 2024",
    readTime: "4 min",
    excerpt: "Why the current interest rate environment is actually an opportunity for experienced fix-and-flip operators.",
    thumbnailUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
    author: {
      name: "David Chen",
      avatarUrl: "https://i.pravatar.cc/150?u=david",
      role: "Chief Economist"
    },
    content: "Macroeconomic factors are creating a unique divergence in pricing across the Sun Belt..."
  }
];
