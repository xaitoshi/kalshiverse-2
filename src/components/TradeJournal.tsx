import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, CheckCircle, TrendingUp, TrendingDown, Trash2, ChevronDown, ChevronUp, Lock, Unlock, Eye, EyeOff, RefreshCw, Wallet, Download } from 'lucide-react';
import { checkMarketResolution, fetchAllPolyPositions, PolyPosition } from '../services/polymarketUserService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JournalTrade {
  id: string;
  createdAt: string;
  market: string;
  conditionId?: string;   // for auto-resolution sync
  strategy: string;
  side: 'YES' | 'NO';
  entry: number;
  size: number;
  exit?: number;
  closedAt?: string;
  status: 'open' | 'won' | 'lost';
  notes: string;
}

const STORAGE_KEY = 'klvs_journal_trades';
const SESSION_KEY = 'klvs_admin_auth';
const ADMIN_PASSWORD = 'kalshi2026'; // change this

function loadTrades(): JournalTrade[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}
function saveLocal(t: JournalTrade[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); }

async function fetchFromApi(): Promise<JournalTrade[] | null> {
  try {
    const res = await fetch('/api/trades');
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function saveToApi(t: JournalTrade[]): Promise<void> {
  const res = await fetch('/api/trades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(t),
  });
  if (!res.ok) throw new Error('Save failed');
}

function loadAdminSession() { return sessionStorage.getItem(SESSION_KEY) === '1'; }

function pnl(t: JournalTrade): number | null {
  if (t.status === 'open' || t.exit == null) return null;
  return (t.exit - t.entry) * (t.size / t.entry);
}
function pnlPct(t: JournalTrade): number | null {
  if (t.exit == null) return null;
  return ((t.exit - t.entry) / t.entry) * 100;
}
function fmt2(n: number) {
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DEFAULT_STRATEGIES = ['Earnings Surprise', 'Macro Fade', 'Odds Arbitrage', 'Momentum', 'Contrarian', 'News Catalyst'];

// ─── Login modal ──────────────────────────────────────────────────────────────

function LoginModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) { sessionStorage.setItem(SESSION_KEY, '1'); onSuccess(); }
    else { setError('Incorrect password.'); setPw(''); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-green-500/30 rounded-lg p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-green-400 font-bold font-mono text-sm"><Lock className="w-4 h-4" /> ADMIN ACCESS</div>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-600 hover:text-gray-400" /></button>
        </div>
        <form onSubmit={submit}>
          <label className="text-[10px] text-gray-500 font-mono mb-1 block">PASSWORD</label>
          <div className="relative mb-4">
            <input
              type={show ? 'text' : 'password'} value={pw}
              onChange={e => { setPw(e.target.value); setError(''); }} autoFocus
              className="w-full bg-black/40 border border-green-500/20 rounded px-3 py-2.5 pr-10 text-sm text-gray-200 focus:outline-none focus:border-green-500/50 font-mono"
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs font-mono mb-3">{error}</p>}
          <button type="submit" className="w-full py-2.5 bg-green-500/10 border border-green-500/40 text-green-400 rounded text-sm hover:bg-green-500/20 transition-colors font-mono">Unlock</button>
        </form>
      </div>
    </div>
  );
}

// ─── Strategy stats ───────────────────────────────────────────────────────────

function StrategyStats({ trades }: { trades: JournalTrade[] }) {
  const strategies = [...new Set(trades.map(t => t.strategy))].filter(Boolean);
  if (!strategies.length) return null;
  return (
    <div className="mb-8">
      <h3 className="text-green-400/70 text-xs font-mono tracking-widest mb-3">STRATEGY PERFORMANCE</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {strategies.map(strat => {
          const st = trades.filter(t => t.strategy === strat);
          const closed = st.filter(t => t.status !== 'open');
          const wins = closed.filter(t => t.status === 'won');
          const wr = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : null;
          const tp = closed.reduce((s, t) => s + (pnl(t) ?? 0), 0);
          const open = st.filter(t => t.status === 'open').length;
          return (
            <div key={strat} className="border border-green-500/20 rounded-lg p-4 bg-black/20">
              <div className="text-sm font-bold text-gray-200 mb-3 truncate">{strat}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className={`text-lg font-bold font-mono ${wr == null ? 'text-gray-600' : wr >= 60 ? 'text-green-400' : wr >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{wr != null ? `${wr}%` : '—'}</div>
                  <div className="text-[10px] text-gray-600">WIN RATE</div>
                </div>
                <div>
                  <div className={`text-lg font-bold font-mono ${tp >= 0 ? 'text-green-400' : 'text-red-400'}`}>{tp >= 0 ? '+' : '-'}${fmt2(tp)}</div>
                  <div className="text-[10px] text-gray-600">P&L</div>
                </div>
                <div>
                  <div className="text-lg font-bold font-mono text-gray-300">{st.length}</div>
                  <div className="text-[10px] text-gray-600">TRADES{open > 0 ? ` (${open})` : ''}</div>
                </div>
              </div>
              {closed.length > 0 && (
                <div className="mt-3 h-1 rounded-full bg-red-500/30 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(wins.length / closed.length) * 100}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add trade form ───────────────────────────────────────────────────────────

function AddTradeForm({ strategies, onAdd, onClose, prefill }: {
  strategies: string[];
  onAdd: (t: JournalTrade) => void;
  onClose: () => void;
  prefill?: Partial<JournalTrade>;
}) {
  const [market, setMarket] = useState(prefill?.market ?? '');
  const [conditionId, setConditionId] = useState(prefill?.conditionId ?? '');
  const [strategy, setStrategy] = useState(strategies[0] ?? '');
  const [customStrategy, setCustomStrategy] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [side, setSide] = useState<'YES' | 'NO'>(prefill?.side ?? 'YES');
  const [entry, setEntry] = useState(prefill?.entry != null ? String(prefill.entry) : '');
  const [size, setSize] = useState(prefill?.size != null ? String(prefill.size) : '');
  const [notes, setNotes] = useState(prefill?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entryNum = parseFloat(entry);
    const sizeNum = parseFloat(size);
    if (!market || isNaN(entryNum) || isNaN(sizeNum) || entryNum <= 0 || entryNum >= 1 || sizeNum <= 0) return;
    const strat = useCustom ? customStrategy.trim() : strategy;
    if (!strat) return;
    onAdd({
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      market: market.trim(),
      conditionId: conditionId.trim() || undefined,
      strategy: strat,
      side,
      entry: entryNum,
      size: sizeNum,
      notes: notes.trim(),
      status: 'open',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="border border-green-500/30 rounded-lg p-5 mb-6 bg-green-500/5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-green-400 text-sm font-bold font-mono">New Trade</span>
        <button type="button" onClick={onClose} className="text-gray-600 hover:text-gray-400"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="sm:col-span-2">
          <label className="text-[10px] text-gray-500 mb-1 block font-mono">MARKET</label>
          <input value={market} onChange={e => setMarket(e.target.value)} required
            placeholder="e.g. Fed to cut rates in May 2026?"
            className="w-full bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-green-500/50" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] text-gray-500 mb-1 block font-mono">CONDITION ID <span className="text-gray-600">(optional — enables auto-resolution sync)</span></label>
          <input value={conditionId} onChange={e => setConditionId(e.target.value)}
            placeholder="0x… from Polymarket"
            className="w-full bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-green-500/50 font-mono text-xs" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-1 block font-mono">STRATEGY</label>
          {useCustom
            ? <input value={customStrategy} onChange={e => setCustomStrategy(e.target.value)} required placeholder="Strategy name"
                className="w-full bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-green-500/50" />
            : <select value={strategy} onChange={e => setStrategy(e.target.value)}
                className="w-full bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-green-500/50">
                {strategies.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
          }
          <button type="button" onClick={() => setUseCustom(u => !u)} className="text-[10px] text-green-500/50 hover:text-green-400 mt-1 transition-colors font-mono">
            {useCustom ? '← pick existing' : '+ new strategy'}
          </button>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-1 block font-mono">SIDE</label>
          <div className="flex gap-2">
            {(['YES', 'NO'] as const).map(s => (
              <button key={s} type="button" onClick={() => setSide(s)}
                className={`flex-1 py-2 rounded text-sm font-bold border transition-colors ${side === s ? (s === 'YES' ? 'bg-green-500/20 border-green-500/60 text-green-400' : 'bg-red-500/20 border-red-500/60 text-red-400') : 'border-green-500/20 text-gray-600 hover:text-gray-400'}`}
              >{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-1 block font-mono">ENTRY PRICE (0–1)</label>
          <input type="number" step="0.01" min="0.01" max="0.99" value={entry} onChange={e => setEntry(e.target.value)} required placeholder="0.45"
            className="w-full bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-green-500/50" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-1 block font-mono">SIZE (USDC)</label>
          <input type="number" step="1" min="1" value={size} onChange={e => setSize(e.target.value)} required placeholder="100"
            className="w-full bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-green-500/50" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] text-gray-500 mb-1 block font-mono">NOTES (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Thesis, signals, context…"
            className="w-full bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-green-500/50" />
        </div>
      </div>
      <button type="submit" className="w-full py-2 bg-green-500/10 border border-green-500/40 text-green-400 rounded text-sm hover:bg-green-500/20 transition-colors font-mono">
        Log Trade
      </button>
    </form>
  );
}

// ─── Close trade modal ────────────────────────────────────────────────────────

function CloseTradeModal({ trade, onClose, onSave }: { trade: JournalTrade; onClose: () => void; onSave: (exit: number, status: 'won' | 'lost') => void }) {
  const [exit, setExit] = useState('');
  const exitNum = parseFloat(exit);
  const outcome = !isNaN(exitNum) ? (exitNum >= trade.entry ? 'won' : 'lost') : null;
  const estPnl = !isNaN(exitNum) ? (exitNum - trade.entry) * (trade.size / trade.entry) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-green-500/30 rounded-lg p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-green-400 font-bold text-sm font-mono">Close Trade</span>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-600" /></button>
        </div>
        <div className="text-xs text-gray-400 mb-4 leading-relaxed">{trade.market}</div>
        <div className="flex gap-4 text-xs text-gray-500 mb-4 font-mono">
          <span>{trade.side} @ {trade.entry.toFixed(2)}</span><span>${trade.size} USDC</span>
        </div>
        <label className="text-[10px] text-gray-500 mb-1 block font-mono">EXIT PRICE (0–1)</label>
        <input type="number" step="0.01" min="0" max="1" value={exit} onChange={e => setExit(e.target.value)}
          placeholder="0.00 = full loss · 1.00 = full win"
          className="w-full bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-green-500/50 mb-3" />
        {estPnl != null && (
          <div className={`text-xs mb-4 font-mono ${estPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {estPnl >= 0 ? '+' : '-'}${fmt2(estPnl)} ({pnlPct({ ...trade, exit: exitNum })?.toFixed(1)}%) · {outcome === 'won' ? '✓ WIN' : '✗ LOSS'}
          </div>
        )}
        <button disabled={!outcome} onClick={() => outcome && onSave(exitNum, outcome)}
          className="w-full py-2 bg-green-500/10 border border-green-500/40 text-green-400 rounded text-sm hover:bg-green-500/20 transition-colors disabled:opacity-30 font-mono">
          Confirm Close
        </button>
      </div>
    </div>
  );
}

// ─── Wallet importer ──────────────────────────────────────────────────────────

function positionKey(p: PolyPosition) { return `${p.conditionId}-${p.outcome}`; }

function positionToJournalTrade(p: PolyPosition, strategy: string, address: string): JournalTrade {
  const side: 'YES' | 'NO' = p.outcome.toLowerCase() === 'yes' ? 'YES' : 'NO';
  let status: JournalTrade['status'] = 'open';
  let exitPrice: number | undefined;
  if (p.closed) {
    if (p.winningOutcome != null) {
      const won = p.outcome.toLowerCase() === p.winningOutcome.toLowerCase();
      status = won ? 'won' : 'lost';
      exitPrice = won ? 1.0 : 0.0;
    } else {
      status = p.cashPnl >= 0 ? 'won' : 'lost';
      exitPrice = p.size > 0 ? (p.initialValue + p.cashPnl) / p.size : undefined;
    }
  }
  return {
    id: `import-${positionKey(p)}`,
    createdAt: new Date().toISOString(),
    market: p.title,
    conditionId: p.conditionId || undefined,
    strategy,
    side,
    entry: p.avgPrice,
    size: p.initialValue,
    exit: exitPrice,
    closedAt: p.closed ? new Date().toISOString() : undefined,
    status,
    notes: `Imported from ${address.slice(0, 8)}…`,
  };
}

function WalletImporter({ strategies, onImport, onClose }: {
  strategies: string[];
  onImport: (trades: JournalTrade[]) => void;
  onClose: () => void;
}) {
  const [address, setAddress] = useState('');
  const [positions, setPositions] = useState<PolyPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [strategy, setStrategy] = useState(strategies[0] ?? '');
  const [customStrategy, setCustomStrategy] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [showClosed, setShowClosed] = useState(true);

  const fetchPositions = async () => {
    if (!address.trim()) return;
    setLoading(true); setError(''); setPositions([]); setSelected(new Set());
    try {
      const all = await fetchAllPolyPositions(address.trim());
      setPositions(all);
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  const visible = showClosed ? positions : positions.filter(p => !p.closed);

  const toggle = (k: string) => setSelected(prev => {
    const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next;
  });
  const toggleAll = () => {
    if (selected.size === visible.length) setSelected(new Set());
    else setSelected(new Set(visible.map(positionKey)));
  };

  const handleImport = () => {
    const strat = useCustom ? customStrategy.trim() : strategy;
    if (!strat || !selected.size) return;
    const toImport = positions
      .filter(p => selected.has(positionKey(p)))
      .map(p => positionToJournalTrade(p, strat, address));
    onImport(toImport);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-green-500/30 rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 font-bold font-mono text-sm">
            <Wallet className="w-4 h-4" /> IMPORT FROM WALLET
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-600 hover:text-gray-400" /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {/* Address input */}
          <div className="flex gap-2 mb-4">
            <input value={address} onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchPositions()}
              placeholder="0x… Polymarket wallet address"
              className="flex-1 bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-green-500/50 font-mono" />
            <button onClick={fetchPositions} disabled={loading || !address.trim()}
              className="px-4 py-2 text-xs bg-green-500/10 border border-green-500/40 text-green-400 rounded hover:bg-green-500/20 disabled:opacity-40 font-mono flex items-center gap-2">
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs font-mono mb-3">{error}</p>}

          {positions.length > 0 && (
            <>
              {/* Strategy + filter */}
              <div className="flex flex-wrap gap-3 items-end mb-4">
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] text-gray-500 mb-1 block font-mono">ASSIGN STRATEGY</label>
                  <div className="flex gap-2 items-center">
                    {useCustom
                      ? <input value={customStrategy} onChange={e => setCustomStrategy(e.target.value)} placeholder="Strategy name"
                          className="flex-1 bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-green-500/50" />
                      : <select value={strategy} onChange={e => setStrategy(e.target.value)}
                          className="flex-1 bg-black/40 border border-green-500/20 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-green-500/50">
                          {strategies.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    }
                    <button type="button" onClick={() => setUseCustom(u => !u)} className="text-[10px] text-green-500/50 hover:text-green-400 whitespace-nowrap font-mono transition-colors">
                      {useCustom ? '← existing' : '+ new'}
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 font-mono cursor-pointer whitespace-nowrap pb-2">
                  <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} className="accent-green-400" />
                  Show closed
                </label>
              </div>

              {/* Select all row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 font-mono">
                  {visible.length} positions · {selected.size} selected
                  {' '}({positions.filter(p => !p.closed).length} open, {positions.filter(p => p.closed).length} closed)
                </span>
                <button onClick={toggleAll} className="text-xs text-green-500/60 hover:text-green-400 font-mono transition-colors">
                  {selected.size === visible.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {/* Position list */}
              <div className="border border-green-500/20 rounded-lg overflow-hidden mb-4">
                {visible.map((p, i) => {
                  const k = positionKey(p);
                  const pnlVal = p.cashPnl;
                  return (
                    <label key={k} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-green-500/5 border-b border-green-500/10 last:border-0 ${i % 2 ? 'bg-white/[0.01]' : ''}`}>
                      <input type="checkbox" checked={selected.has(k)} onChange={() => toggle(k)} className="accent-green-400 w-3.5 h-3.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-gray-200 truncate">{p.title}</span>
                          {p.closed
                            ? <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${pnlVal >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {pnlVal >= 0 ? 'WON' : 'LOST'}
                              </span>
                            : <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 shrink-0">OPEN</span>
                          }
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono flex-wrap">
                          <span className={p.outcome.toLowerCase() === 'yes' ? 'text-green-400' : 'text-red-400'}>{p.outcome.toUpperCase()}</span>
                          <span>entry {(p.avgPrice * 100).toFixed(1)}¢</span>
                          <span>${p.initialValue.toFixed(2)} in</span>
                          {p.closed && (
                            <span className={pnlVal >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {pnlVal >= 0 ? '+' : ''}${Math.abs(pnlVal).toFixed(2)} P&L ({p.percentPnl >= 0 ? '+' : ''}{p.percentPnl.toFixed(1)}%)
                            </span>
                          )}
                          {!p.closed && (
                            <span className={p.cashPnl >= 0 ? 'text-green-400/70' : 'text-red-400/70'}>
                              unrealised {p.cashPnl >= 0 ? '+' : ''}${p.cashPnl.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {positions.length > 0 && (
          <div className="px-5 py-4 border-t border-green-500/20">
            <button onClick={handleImport} disabled={!selected.size || (!strategy && !customStrategy)}
              className="w-full py-2.5 bg-green-500/10 border border-green-500/40 text-green-400 rounded text-sm hover:bg-green-500/20 transition-colors disabled:opacity-30 font-mono flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Import {selected.size} position{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Trade row ────────────────────────────────────────────────────────────────

function TradeRow({ trade, onClose, onDelete, isAdmin }: { trade: JournalTrade; onClose: () => void; onDelete: () => void; isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const p = pnl(trade);
  const pp = pnlPct(trade);

  return (
    <>
      <tr className="border-b border-green-500/10 hover:bg-white/[0.02] transition-colors">
        <td className="px-4 py-3 text-gray-500 text-[11px] whitespace-nowrap font-mono">
          {new Date(trade.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
        </td>
        <td className="px-4 py-3 text-gray-200 text-xs max-w-xs">
          <div className="truncate">{trade.market}</div>
          {trade.conditionId && <div className="text-[9px] text-gray-700 font-mono truncate mt-0.5">{trade.conditionId.slice(0, 18)}…</div>}
          {trade.notes && (
            <button onClick={() => setExpanded(e => !e)} className="text-[10px] text-gray-600 hover:text-gray-400 flex items-center gap-0.5 mt-0.5">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} notes
            </button>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{trade.strategy}</td>
        <td className={`px-4 py-3 text-xs font-bold font-mono ${trade.side === 'YES' ? 'text-green-400' : 'text-red-400'}`}>{trade.side}</td>
        <td className="px-4 py-3 text-xs text-gray-300 font-mono">{(trade.entry * 100).toFixed(1)}¢</td>
        <td className="px-4 py-3 text-xs text-gray-300 font-mono">${trade.size}</td>
        <td className="px-4 py-3 text-xs font-mono">
          {trade.status === 'open' ? (
            <span className="flex items-center gap-1 text-yellow-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" /> OPEN
            </span>
          ) : (
            <span className={`flex items-center gap-1 ${trade.status === 'won' ? 'text-green-400' : 'text-red-400'}`}>
              {trade.status === 'won' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {p != null ? `${p >= 0 ? '+' : '-'}$${fmt2(p)}` : ''}
              {pp != null ? <span className="text-gray-500 text-[10px]"> ({pp >= 0 ? '+' : ''}{pp.toFixed(1)}%)</span> : null}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isAdmin && trade.status === 'open' && (
              <button onClick={onClose} title="Close trade" className="text-gray-600 hover:text-green-400 transition-colors">
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}
            {isAdmin && (
              <button onClick={onDelete} title="Delete" className="text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && trade.notes && (
        <tr className="border-b border-green-500/10 bg-black/20">
          <td colSpan={8} className="px-4 py-2 text-[11px] text-gray-500 italic font-mono">{trade.notes}</td>
        </tr>
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TradeJournal() {
  const [trades, setTrades] = useState<JournalTrade[]>(loadTrades);
  const [showForm, setShowForm] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [closingTrade, setClosingTrade] = useState<JournalTrade | null>(null);
  const [isAdmin, setIsAdmin] = useState(loadAdminSession);
  const [showLogin, setShowLogin] = useState(false);
  const [filterStrategy, setFilterStrategy] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  const [gistStatus, setGistStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');

  // On mount: hydrate from API
  useEffect(() => {
    setGistStatus('syncing');
    fetchFromApi().then(remote => {
      if (!isMounted.current) return;
      if (remote) {
        setTrades(remote);
        saveLocal(remote);
        setGistStatus('ok');
      } else {
        setGistStatus('error');
      }
    });
  }, []);

  // On every change: save locally + push to API
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    saveLocal(trades);
    if (saveRef.current) clearTimeout(saveRef.current);
    setGistStatus('syncing');
    saveRef.current = setTimeout(() => {
      saveToApi(trades)
        .then(() => { if (isMounted.current) setGistStatus('ok'); })
        .catch(() => { if (isMounted.current) setGistStatus('error'); });
    }, 1000);
  }, [trades]);

  const allStrategies = [...new Set(trades.map(t => t.strategy))].filter(Boolean);
  const strategyOptions = [...new Set([...DEFAULT_STRATEGIES, ...allStrategies])];

  const addTrade = (t: JournalTrade) => { setTrades(prev => [t, ...prev]); setShowForm(false); };

  const importTrades = (incoming: JournalTrade[]) => {
    // Deduplicate by id
    setTrades(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const fresh = incoming.filter(t => !existingIds.has(t.id));
      return [...fresh, ...prev];
    });
    setShowImporter(false);
  };

  const closeTrade = (exit: number, status: 'won' | 'lost') => {
    if (!closingTrade) return;
    setTrades(prev => prev.map(t =>
      t.id === closingTrade.id ? { ...t, exit, status, closedAt: new Date().toISOString() } : t
    ));
    setClosingTrade(null);
  };

  const deleteTrade = (id: string) => setTrades(prev => prev.filter(t => t.id !== id));

  // Auto-resolution sync — checks all open trades that have a conditionId
  const syncResolutions = async () => {
    const openWithId = trades.filter(t => t.status === 'open' && t.conditionId);
    if (!openWithId.length) { setSyncResult('No open trades with a Condition ID to sync.'); return; }
    setSyncing(true); setSyncResult(null);
    let updated = 0;
    const results = await Promise.all(openWithId.map(t => checkMarketResolution(t.conditionId!)));
    setTrades(prev => prev.map(t => {
      const r = results.find(r => r.conditionId === t.conditionId);
      if (!r?.resolved || !r.winningOutcome) return t;
      const won = r.winningOutcome.toLowerCase() === t.side.toLowerCase();
      updated++;
      return { ...t, status: won ? 'won' : 'lost', exit: won ? 1 : 0, closedAt: new Date().toISOString() };
    }));
    setSyncing(false);
    setSyncResult(updated > 0 ? `✓ ${updated} trade${updated > 1 ? 's' : ''} resolved.` : 'No new resolutions found.');
    setTimeout(() => setSyncResult(null), 4000);
  };

  const filtered = trades.filter(t => {
    if (filterStrategy !== 'all' && t.strategy !== filterStrategy) return false;
    if (filterStatus === 'open' && t.status !== 'open') return false;
    if (filterStatus === 'closed' && t.status === 'open') return false;
    return true;
  });

  const closed = trades.filter(t => t.status !== 'open');
  const wins = closed.filter(t => t.status === 'won');
  const overallWinRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : null;
  const totalPnl = closed.reduce((s, t) => s + (pnl(t) ?? 0), 0);
  const openWithConditionId = trades.filter(t => t.status === 'open' && t.conditionId).length;

  return (
    <div className="border-t border-green-500/20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-green-400 font-bold tracking-wider text-lg font-mono">// OPEN TRADE JOURNAL</h2>
            {gistStatus === 'syncing' && <span className="text-[10px] font-mono text-yellow-400 animate-pulse">● syncing</span>}
            {gistStatus === 'ok'      && <span className="text-[10px] font-mono text-green-500">● gist synced</span>}
            {gistStatus === 'error'   && <span className="text-[10px] font-mono text-red-400" title="Check VITE_GIST_ID and VITE_GITHUB_TOKEN in Vercel env vars">● gist offline</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isAdmin && openWithConditionId > 0 && (
              <button onClick={syncResolutions} disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 text-xs border font-mono rounded transition-colors border-blue-500/30 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Sync Resolutions
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setShowImporter(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs border font-mono rounded transition-colors border-green-500/30 text-green-400 hover:bg-green-500/10">
                <Wallet className="w-3.5 h-3.5" /> Import Wallet
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setShowForm(s => !s)}
                className="flex items-center gap-2 px-4 py-2 text-xs bg-green-500/10 border border-green-500/40 text-green-400 rounded hover:bg-green-500/20 transition-colors font-mono">
                <Plus className="w-3.5 h-3.5" /> Log Trade
              </button>
            )}
            <button
              onClick={() => { if (isAdmin) { sessionStorage.removeItem(SESSION_KEY); setIsAdmin(false); setShowForm(false); } else setShowLogin(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border font-mono rounded transition-colors border-green-500/20 text-gray-500 hover:text-green-400 hover:border-green-500/40">
              {isAdmin ? <><Unlock className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Admin</span></> : <><Lock className="w-3.5 h-3.5" /> Admin</>}
            </button>
          </div>
        </div>
        <p className="text-gray-500 text-xs mb-1 font-mono">Log your trades and track performance by strategy.</p>
        {syncResult && <p className="text-blue-400 text-xs font-mono mb-3">{syncResult}</p>}
        <div className="mb-6" />

        {/* Stats */}
        {trades.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'OVERALL WIN RATE', value: overallWinRate != null ? `${overallWinRate}%` : '—', color: overallWinRate != null && overallWinRate >= 50 ? 'text-green-400' : 'text-yellow-400' },
              { label: 'REALISED P&L', value: `${totalPnl >= 0 ? '+' : '-'}$${fmt2(totalPnl)}`, color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'CLOSED TRADES', value: `${wins.length}W / ${closed.length - wins.length}L`, color: 'text-gray-300' },
              { label: 'OPEN POSITIONS', value: String(trades.filter(t => t.status === 'open').length), color: 'text-yellow-400' },
            ].map(s => (
              <div key={s.label} className="border border-green-500/20 rounded-lg p-4 bg-black/20">
                <div className="text-[10px] text-gray-600 font-mono mb-1">{s.label}</div>
                <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <StrategyStats trades={trades} />

        {showForm && <AddTradeForm strategies={strategyOptions} onAdd={addTrade} onClose={() => setShowForm(false)} />}

        {/* Filters */}
        {trades.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={filterStrategy} onChange={e => setFilterStrategy(e.target.value)}
              className="bg-black/40 border border-green-500/20 rounded px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-green-500/40 font-mono">
              <option value="all">All strategies</option>
              {allStrategies.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex gap-1">
              {(['all', 'open', 'closed'] as const).map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 text-xs rounded border font-mono transition-colors ${filterStatus === f ? 'border-green-500/60 bg-green-500/10 text-green-400' : 'border-green-500/20 text-gray-500 hover:text-green-400'}`}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {trades.length === 0 ? (
          <div className="border border-green-500/10 rounded-lg p-10 text-center text-gray-600 text-xs font-mono">
            No trades logged yet. Hit "Log Trade" or "Import Wallet" to get started.
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-green-500/10 rounded-lg p-8 text-center text-gray-600 text-xs font-mono">No trades match the current filter.</div>
        ) : (
          <div className="border border-green-500/20 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-gray-600 border-b border-green-500/10 bg-green-500/5">
                  <th className="text-left px-4 py-2 font-normal">DATE</th>
                  <th className="text-left px-4 py-2 font-normal">MARKET</th>
                  <th className="text-left px-4 py-2 font-normal">STRATEGY</th>
                  <th className="text-left px-4 py-2 font-normal">SIDE</th>
                  <th className="text-left px-4 py-2 font-normal">ENTRY</th>
                  <th className="text-left px-4 py-2 font-normal">SIZE</th>
                  <th className="text-left px-4 py-2 font-normal">RESULT</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <TradeRow key={t.id} trade={t} isAdmin={isAdmin}
                    onClose={() => setClosingTrade(t)} onDelete={() => deleteTrade(t.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {closingTrade && <CloseTradeModal trade={closingTrade} onClose={() => setClosingTrade(null)} onSave={closeTrade} />}
      {showLogin && <LoginModal onSuccess={() => { setIsAdmin(true); setShowLogin(false); }} onClose={() => setShowLogin(false)} />}
      {showImporter && <WalletImporter strategies={strategyOptions} onImport={importTrades} onClose={() => setShowImporter(false)} />}
    </div>
  );
}
