export interface PolyTrade {
  id: string;
  timestamp: number;
  type: string;       // 'BUY' | 'SELL' | 'REDEEM'
  outcome: string;    // 'Yes' | 'No'
  title: string;
  slug: string;
  price: number;
  size: number;       // shares
  usdcSize: number;   // dollar value
  transactionHash: string;
}

export interface PolyPosition {
  conditionId: string;
  title: string;
  slug: string;
  outcome: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  endDate: string;
  closed: boolean;
  winningOutcome?: string | null; // set after gamma API resolution check
}

export interface PolyProfile {
  address: string;
  displayName?: string;
  bio?: string;
  pfpUrl?: string;
  profileImage?: string;
}

export async function fetchPolyProfile(address: string): Promise<PolyProfile | null> {
  try {
    const res = await fetch(`/api/poly-data/profiles?address=${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data[0] ?? null : data;
  } catch {
    return null;
  }
}

export async function fetchPolyActivity(address: string, limit = 50): Promise<PolyTrade[]> {
  const res = await fetch(`/api/poly-data/activity?user=${address}&limit=${limit}`);
  if (!res.ok) throw new Error(`Activity fetch failed: ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((r: any) => ({
    id: r.id ?? r.transactionHash ?? String(r.timestamp),
    timestamp: r.timestamp,
    type: r.side ?? r.type ?? 'TRADE',
    outcome: r.outcome ?? '',
    title: r.title ?? r.market ?? '',
    slug: r.slug ?? '',
    price: Number(r.price ?? 0),
    size: Number(r.size ?? 0),
    usdcSize: Number(r.usdcSize ?? r.amount ?? 0),
    transactionHash: r.transactionHash ?? '',
  }));
}

export interface MarketResolution {
  conditionId: string;
  resolved: boolean;
  winningOutcome: string | null; // 'Yes' | 'No' | null if unresolved
}

function resolveFromClobMarket(conditionId: string, m: any): MarketResolution {
  if (!m?.closed) return { conditionId, resolved: false, winningOutcome: null };
  const tokens: { outcome: string; price: number }[] = m.tokens ?? [];
  const winner = tokens.find(t => t.price >= 0.99);
  return { conditionId, resolved: !!winner, winningOutcome: winner?.outcome ?? null };
}

/** Check if a market has resolved. Uses CLOB exact lookup first, then title search fallback. */
export async function checkMarketResolution(conditionId: string, marketTitle?: string): Promise<MarketResolution> {
  try {
    // Try exact CLOB lookup first (requires full 66-char conditionId)
    if (conditionId.length >= 60) {
      const res = await fetch(`/api/clob/markets/${conditionId}`);
      if (res.ok) {
        const m = await res.json();
        if (!m.error) return resolveFromClobMarket(conditionId, m);
      }
    }

    // Fallback: search CLOB by market title
    if (marketTitle) {
      const q = encodeURIComponent(marketTitle.slice(0, 60));
      const res = await fetch(`/api/clob/markets?search=${q}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        const markets: any[] = data?.data ?? (Array.isArray(data) ? data : []);
        // Find the closest match by question text
        const match = markets.find(m =>
          m.question?.toLowerCase().includes('beat') &&
          m.question?.toLowerCase().includes('earnings') &&
          m.closed
        );
        if (match) return resolveFromClobMarket(match.condition_id ?? conditionId, match);
      }
    }

    return { conditionId, resolved: false, winningOutcome: null };
  } catch {
    return { conditionId, resolved: false, winningOutcome: null };
  }
}

/** Fetch conditionId for a market by slug via the gamma API. */
export async function fetchConditionIdBySlug(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/polymarket/events?slug=${slug}`);
    if (!res.ok) return null;
    const data = await res.json();
    const events: any[] = Array.isArray(data) ? data : [data];
    // events have markets array; grab first market's conditionId
    const conditionId = events[0]?.markets?.[0]?.conditionId ?? null;
    return conditionId;
  } catch {
    return null;
  }
}

function mapPosition(r: any): PolyPosition {
  return {
    conditionId: r.conditionId ?? '',
    title: r.title ?? r.market ?? '',
    slug: r.slug ?? '',
    outcome: r.outcome ?? '',
    size: Number(r.size ?? 0),
    avgPrice: Number(r.avgPrice ?? r.averagePrice ?? 0),
    initialValue: Number(r.initialValue ?? 0),
    currentValue: Number(r.currentValue ?? 0),
    cashPnl: Number(r.cashPnl ?? 0),
    percentPnl: Number(r.percentPnl ?? 0),
    endDate: r.endDate ?? '',
    closed: Boolean(r.closed),
  };
}

/** Fetch positions for a wallet from the data API. */
export async function fetchPolyPositions(address: string): Promise<PolyPosition[]> {
  const params = new URLSearchParams({ user: address, limit: '500', offset: '0', sizeThreshold: '.001' });
  const res = await fetch(`/api/poly-data/positions?${params}`);
  if (!res.ok) throw new Error(`Positions fetch failed: ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(mapPosition);
}

/**
 * Fetch ALL positions for a wallet, enriched with resolution status from the gamma API.
 * The data API doesn't return a `closed` field — we detect resolution by checking
 * the gamma API for positions whose endDate is in the past.
 */
export async function fetchAllPolyPositions(address: string): Promise<PolyPosition[]> {
  const positions = await fetchPolyPositions(address);

  const today = new Date().toISOString().split('T')[0];
  const pastPositions = positions.filter(p => p.endDate && p.endDate < today);

  if (pastPositions.length > 0) {
    const resolutions = await Promise.allSettled(
      pastPositions.map(p => checkMarketResolution(p.conditionId))
    );

    resolutions.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.resolved) {
        const p = pastPositions[i];
        p.closed = true;
        p.winningOutcome = r.value.winningOutcome;
        // Recompute P&L based on resolution: win = $1/share, loss = $0/share
        const won = p.winningOutcome != null &&
          p.outcome.toLowerCase() === p.winningOutcome.toLowerCase();
        p.currentValue = won ? p.size : 0;
        p.cashPnl = p.currentValue - p.initialValue;
        p.percentPnl = p.initialValue > 0 ? (p.cashPnl / p.initialValue) * 100 : 0;
      }
    });
  }

  // Sort: open first, then closed sorted by P&L descending
  positions.sort((a, b) => {
    if (a.closed !== b.closed) return a.closed ? 1 : -1;
    return b.cashPnl - a.cashPnl;
  });

  return positions;
}
