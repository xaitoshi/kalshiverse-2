import React, { useState, useCallback, useEffect } from 'react';
import { BookOpen, Clock, ArrowUpRight, Search, X, Loader2, ExternalLink } from 'lucide-react';
import TradeJournal from './TradeJournal';
import {
  fetchPolyActivity,
  fetchPolyPositions,
  fetchPolyProfile,
  PolyTrade,
  PolyPosition,
  PolyProfile,
} from '../services/polymarketUserService';
import { getArticles, Article } from '../data/articlesData';

const TAG_COLORS: Record<string, string> = {
  Macro:    'text-blue-400 bg-blue-400/10 border-blue-400/30',
  Earnings: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  Crypto:   'text-purple-400 bg-purple-400/10 border-purple-400/30',
  Tech:     'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  Equities: 'text-green-400 bg-green-400/10 border-green-400/30',
  Options:  'text-orange-400 bg-orange-400/10 border-orange-400/30',
  Strategy: 'text-pink-400 bg-pink-400/10 border-pink-400/30',
};

function Tag({ label }: { label: string }) {
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${TAG_COLORS[label] ?? 'text-gray-400 bg-gray-400/10 border-gray-400/30'}`}>
      {label}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Wallet tracker ───────────────────────────────────────────────────────────

interface TrackedAccount {
  address: string;
  profile: PolyProfile | null;
  trades: PolyTrade[];
  positions: PolyPosition[];
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function AccountCard({ account, onRemove }: { account: TrackedAccount; onRemove: () => void }) {
  const [tab, setTab] = useState<'activity' | 'positions'>('positions');

  const totalPnl = account.positions.reduce((s, p) => s + p.cashPnl, 0);
  const openCount = account.positions.filter(p => !p.closed).length;

  return (
    <div className="border border-green-500/20 rounded-lg overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-green-500/5 border-b border-green-500/20">
        <div className="flex items-center gap-3">
          {account.profile?.pfpUrl || account.profile?.profileImage ? (
            <img src={account.profile.pfpUrl ?? account.profile.profileImage} className="w-8 h-8 rounded-full border border-green-500/30" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full border border-green-500/30 bg-green-500/10 flex items-center justify-center text-green-400 text-xs font-mono">
              {account.address.slice(2, 4).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm font-bold text-green-400 font-mono">
              {account.profile?.displayName ?? shortAddr(account.address)}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">{shortAddr(account.address)}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className={`text-sm font-mono font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}
            </div>
            <div className="text-[10px] text-gray-500">unrealised P&L</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-sm font-mono font-bold text-yellow-400">{openCount}</div>
            <div className="text-[10px] text-gray-500">open positions</div>
          </div>
          <a
            href={`https://polymarket.com/profile/${account.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-green-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-green-500/20">
        {(['positions', 'activity'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-xs font-mono transition-colors ${tab === t ? 'text-green-400 border-b-2 border-green-400 -mb-px' : 'text-gray-500 hover:text-green-400'}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Positions */}
      {tab === 'positions' && (
        <div className="overflow-x-auto">
          {account.positions.length === 0 ? (
            <div className="px-5 py-6 text-xs text-gray-600 font-mono text-center">No open positions found</div>
          ) : (
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-gray-600 border-b border-green-500/10">
                  <th className="text-left px-4 py-2 font-normal">MARKET</th>
                  <th className="text-left px-4 py-2 font-normal">OUTCOME</th>
                  <th className="text-right px-4 py-2 font-normal">SHARES</th>
                  <th className="text-right px-4 py-2 font-normal">AVG</th>
                  <th className="text-right px-4 py-2 font-normal">CURRENT</th>
                  <th className="text-right px-4 py-2 font-normal">P&L</th>
                  <th className="text-right px-4 py-2 font-normal">%</th>
                </tr>
              </thead>
              <tbody>
                {account.positions.map((p, i) => (
                  <tr key={p.conditionId + p.outcome} className={`border-b border-green-500/10 last:border-0 ${i % 2 ? 'bg-white/[0.02]' : ''}`}>
                    <td className="px-4 py-2.5 text-gray-200 max-w-xs truncate">{p.title}</td>
                    <td className="px-4 py-2.5">
                      <span className={p.outcome.toLowerCase() === 'yes' ? 'text-green-400' : 'text-red-400'}>{p.outcome.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmt(p.size)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{(p.avgPrice * 100).toFixed(1)}¢</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">${fmt(p.currentValue)}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${p.cashPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.cashPnl >= 0 ? '+' : ''}${fmt(p.cashPnl)}
                    </td>
                    <td className={`px-4 py-2.5 text-right ${p.percentPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.percentPnl >= 0 ? '+' : ''}{p.percentPnl.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Activity */}
      {tab === 'activity' && (
        <div className="overflow-x-auto">
          {account.trades.length === 0 ? (
            <div className="px-5 py-6 text-xs text-gray-600 font-mono text-center">No recent activity found</div>
          ) : (
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-gray-600 border-b border-green-500/10">
                  <th className="text-left px-4 py-2 font-normal">DATE</th>
                  <th className="text-left px-4 py-2 font-normal">MARKET</th>
                  <th className="text-left px-4 py-2 font-normal">SIDE</th>
                  <th className="text-left px-4 py-2 font-normal">OUTCOME</th>
                  <th className="text-right px-4 py-2 font-normal">PRICE</th>
                  <th className="text-right px-4 py-2 font-normal">USDC</th>
                </tr>
              </thead>
              <tbody>
                {account.trades.slice(0, 30).map((t, i) => (
                  <tr key={t.id} className={`border-b border-green-500/10 last:border-0 ${i % 2 ? 'bg-white/[0.02]' : ''}`}>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(t.timestamp)}</td>
                    <td className="px-4 py-2.5 text-gray-200 max-w-xs truncate">{t.title}</td>
                    <td className={`px-4 py-2.5 ${t.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{t.type}</td>
                    <td className={`px-4 py-2.5 ${t.outcome.toLowerCase() === 'yes' ? 'text-green-400' : 'text-red-400'}`}>{t.outcome.toUpperCase()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{(t.price * 100).toFixed(1)}¢</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">${fmt(t.usdcSize)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResearchSection() {
  const [input, setInput] = useState('');
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState<Article[]>(() => getArticles());

  // Refresh articles when admin saves (storage event from same tab via custom event)
  useEffect(() => {
    const onStorage = () => setArticles(getArticles());
    window.addEventListener('klvs_articles_updated', onStorage);
    return () => window.removeEventListener('klvs_articles_updated', onStorage);
  }, []);

  const addAccount = useCallback(async () => {
    const address = input.trim();
    if (!address) return;
    if (accounts.some(a => a.address.toLowerCase() === address.toLowerCase())) {
      setError('Account already tracked');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const [profile, trades, positions] = await Promise.all([
        fetchPolyProfile(address),
        fetchPolyActivity(address, 50),
        fetchPolyPositions(address),
      ]);
      setAccounts(prev => [...prev, { address, profile, trades, positions }]);
      setInput('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch account');
    } finally {
      setLoading(false);
    }
  }, [input, accounts]);

  const removeAccount = (address: string) =>
    setAccounts(prev => prev.filter(a => a.address !== address));

  return (
    <div className="bg-[#050505] text-white font-mono">
      <div className="border-t border-green-500/20" />

      {/* ── Trade tracker ── */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-green-400 font-bold tracking-wider text-lg mb-2">// POLYMARKET ACCOUNT TRACKER</h2>
        <p className="text-gray-500 text-xs mb-6">Enter any Polymarket wallet address to track their positions and trade activity.</p>

        {/* Input */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-green-500/40" />
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAccount()}
              placeholder="0x… wallet address"
              className="w-full bg-black/40 border border-green-500/30 rounded pl-9 pr-4 py-2.5 text-sm text-green-50 placeholder:text-gray-600 focus:outline-none focus:border-green-500/60"
            />
          </div>
          <button
            onClick={addAccount}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 text-sm bg-green-500/10 border border-green-500/40 text-green-400 rounded hover:bg-green-500/20 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Loading…' : 'Track'}
          </button>
        </div>

        {error && <p className="text-red-400 text-xs mb-4 font-mono">{error}</p>}

        {accounts.length === 0 && !loading && (
          <div className="border border-green-500/10 rounded-lg p-8 text-center text-gray-600 text-xs">
            No accounts tracked yet. Add a Polymarket wallet address above.
          </div>
        )}

        {accounts.map(acc => (
          <AccountCard key={acc.address} account={acc} onRemove={() => removeAccount(acc.address)} />
        ))}
      </div>

      {/* ── Trade Journal ── */}
      <TradeJournal />

      {/* ── Articles ── */}
      <div className="border-t border-green-500/20">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-green-400 font-bold tracking-wider text-lg mb-8">// RESEARCH &amp; ARTICLES</h2>

          {articles.filter(a => a.featured).map(a => (
            <div key={a.id} className="border border-green-500/30 rounded-lg p-6 mb-6 bg-green-500/5 hover:bg-green-500/[0.08] transition-colors cursor-pointer group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border text-green-400 bg-green-400/10 border-green-400/30">FEATURED</span>
                    <Tag label={a.tag} />
                  </div>
                  <h3 className="text-white font-bold text-xl tracking-wide leading-snug mb-3 group-hover:text-green-400 transition-colors">{a.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{a.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.date}</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{a.readTime}</span>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-green-500/40 group-hover:text-green-400 transition-colors shrink-0 mt-1" />
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.filter(a => !a.featured).map(a => (
              <div key={a.id} className="border border-green-500/20 rounded-lg p-5 hover:border-green-500/40 hover:bg-green-500/5 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <Tag label={a.tag} />
                  <ArrowUpRight className="w-4 h-4 text-green-500/30 group-hover:text-green-400 transition-colors" />
                </div>
                <h3 className="text-gray-200 font-bold text-sm leading-snug mb-2 group-hover:text-green-400 transition-colors">{a.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-3">{a.excerpt}</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-600">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.date}</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{a.readTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-green-500/20 py-8 text-center text-xs text-gray-600 font-mono tracking-wider">
        KALSHIVERSE — PREDICTION MARKETS RESEARCH TERMINAL
      </div>
    </div>
  );
}
