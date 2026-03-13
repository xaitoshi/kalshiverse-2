export interface Article {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tag: string;
  featured: boolean;
}

const ARTICLES_KEY = 'klvs_articles_v1';

const DEFAULT_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'The Edge in Earnings Markets: Why Consensus Often Misprices Volatility',
    excerpt: 'Analysing 18 months of Polymarket earnings data reveals a systematic underpricing of upside surprises in mega-cap tech. We examine why analyst revision cycles create predictable mispricings and how to exploit them before the window closes.',
    date: 'Mar 12, 2026', readTime: '8 min read', tag: 'Earnings', featured: true,
  },
  {
    id: '2',
    title: 'Fed Funds Futures vs Prediction Markets: A Divergence Study',
    excerpt: 'When CME FedWatch and Polymarket disagree on rate cut probability, which resolves closer to reality? A backtest across 14 FOMC meetings from 2023–2025 surfaces a consistent pattern worth tracking.',
    date: 'Mar 09, 2026', readTime: '6 min read', tag: 'Macro', featured: false,
  },
  {
    id: '3',
    title: 'Signal Stacking: Combining Options Skew with Prediction Market Odds',
    excerpt: 'Put skew on earnings contracts is a forward-looking fear gauge. Layering it with Polymarket YES prices creates a composite signal that outperforms either metric alone — here is the methodology.',
    date: 'Mar 05, 2026', readTime: '10 min read', tag: 'Options', featured: false,
  },
  {
    id: '4',
    title: 'Kalshi vs Polymarket Liquidity Gaps: Where the Arbitrage Lives',
    excerpt: 'Cross-platform price discrepancies on identical or near-identical events can persist for hours. We map the typical gap size by category and estimate the friction-adjusted yield for active traders.',
    date: 'Feb 27, 2026', readTime: '7 min read', tag: 'Strategy', featured: false,
  },
  {
    id: '5',
    title: 'Insider Activity as an Early Warning System in Earnings Markets',
    excerpt: 'SEC Form 4 filings in the 30-day window before earnings have a statistically significant relationship with Polymarket beat/miss odds drift.',
    date: 'Feb 22, 2026', readTime: '9 min read', tag: 'Earnings', featured: false,
  },
  {
    id: '6',
    title: 'Building a Sector Momentum Filter for Prediction Market Positioning',
    excerpt: 'Sector ETF 30- and 60-day returns correlate with analyst upgrade cycles. When XLK is trending, tech earnings markets historically underprice YES on beat.',
    date: 'Feb 17, 2026', readTime: '5 min read', tag: 'Macro', featured: false,
  },
];

export function getArticles(): Article[] {
  try {
    const raw = localStorage.getItem(ARTICLES_KEY);
    if (raw) return JSON.parse(raw) as Article[];
  } catch {}
  return DEFAULT_ARTICLES;
}

export function saveArticles(articles: Article[]): void {
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
}
