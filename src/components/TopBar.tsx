import React, { useState, useRef, useEffect } from 'react';
import { Search, Globe2, Droplets, Activity, Layers, TrendingUp, ExternalLink, Menu, X } from 'lucide-react';
import { MarketData } from '../data/mockData';

interface SearchResult {
  question: string;
  yesPrice: number;
  volume: string;
  polymarketUrl?: string;
  market: MarketData;
}

interface TopBarProps {
  onOpenEcosystem: () => void;
  onOpenPolyEarn: () => void;
  onOpenOsint: () => void;
  onOpenLiquidity: () => void;
  isOsintOpen: boolean;
  marketData: MarketData[];
  onSelectMarket: (market: MarketData) => void;
}

export default function TopBar({ onOpenEcosystem, onOpenPolyEarn, onOpenOsint, onOpenLiquidity, isOsintOpen, marketData, onSelectMarket }: TopBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) { setResults([]); setIsOpen(false); return; }
    const lower = value.toLowerCase();
    const matched: SearchResult[] = [];
    for (const loc of marketData) {
      for (const m of loc.markets) {
        if (m.question.toLowerCase().includes(lower) || loc.title.toLowerCase().includes(lower)) {
          matched.push({ question: m.question, yesPrice: m.yesPrice, volume: m.volume, polymarketUrl: m.polymarketUrl, market: loc });
        }
      }
    }
    setResults(matched.slice(0, 10));
    setIsOpen(matched.length > 0);
  };

  const closeAll = () => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const SearchDropdown = () => isOpen && results.length > 0 ? (
    <div className="absolute top-full mt-2 right-0 w-[92vw] sm:w-96 max-h-72 overflow-y-auto bg-black/95 border border-green-500/30 rounded-lg backdrop-blur-xl shadow-2xl z-50">
      {results.map((r, i) => (
        <button key={i} onClick={() => { onSelectMarket(r.market); closeAll(); }}
          className="w-full text-left px-4 py-3 hover:bg-green-500/10 border-b border-green-500/10 last:border-b-0 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-200 leading-snug truncate">{r.question}</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-mono text-green-400">YES {Math.round(r.yesPrice * 100)}¢</span>
                <span className="text-xs font-mono text-gray-500">{r.volume}</span>
                <span className="text-[10px] font-mono text-gray-600">{r.market.title}</span>
              </div>
            </div>
            {r.polymarketUrl && (
              <ExternalLink className="w-3.5 h-3.5 text-gray-600 hover:text-green-400 shrink-0 mt-0.5"
                onClick={(e) => { e.stopPropagation(); window.open(r.polymarketUrl, '_blank', 'noopener,noreferrer'); }} />
            )}
          </div>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-3 md:p-4">

      {/* ── Desktop layout (lg+) ─────────────────────────────────────────── */}
      <div className="hidden lg:flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/60 border border-green-500/30 backdrop-blur-md px-4 py-2 rounded-lg text-green-400 font-mono font-bold text-xl tracking-wider">
            <Globe2 className="w-6 h-6" />
            KALSHIVERSE
          </div>
          <div className="flex items-center bg-black/60 border border-green-500/30 backdrop-blur-md rounded-lg overflow-hidden p-1 gap-1">
            <button onClick={onOpenLiquidity}
              className="px-4 py-1.5 border border-green-500/50 text-green-400 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-green-500/10 transition-colors">
              <Droplets className="w-4 h-4" /> Liquidity
            </button>
            <button onClick={onOpenOsint}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${isOsintOpen ? 'border border-green-500/50 text-green-400 bg-green-500/10' : 'text-gray-400 hover:text-green-400'}`}>
              <Activity className="w-4 h-4" /> KalshiClaw
            </button>
          </div>
          <div className="flex items-center bg-black/60 border border-green-500/30 backdrop-blur-md rounded-lg px-2 py-1 gap-1">
            <button onClick={onOpenEcosystem}
              className="text-gray-300 hover:text-green-400 hover:bg-green-500/10 px-3 py-1.5 rounded text-sm font-mono flex items-center gap-2 transition-colors">
              <Layers className="w-4 h-4" /> Ecosystem
            </button>
            <button onClick={onOpenPolyEarn}
              className="text-gray-300 hover:text-green-400 hover:bg-green-500/10 px-3 py-1.5 rounded text-sm font-mono flex items-center gap-2 transition-colors">
              <TrendingUp className="w-4 h-4" /> PolyEarn
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 pointer-events-auto">
          <button onClick={() => window.open('https://dexscreener.com/solana/chcvntbwiudh9zz1uhyhnge9d82bsvw6ekgkblguc9af', '_blank', 'noopener,noreferrer')}
            className="bg-black/60 border border-green-500/30 backdrop-blur-md px-4 py-2 rounded-lg text-green-400 font-mono text-sm flex items-center gap-2 cursor-pointer hover:border-green-500/60 hover:bg-green-500/10 transition-colors">
            $KLVS <span className="text-xs bg-green-500/20 px-1.5 py-0.5 rounded">LIVE</span>
          </button>
          <div className="relative" ref={wrapperRef}>
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-green-500/50 z-10" />
            <input type="text" placeholder="Search markets..." value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => { if (results.length > 0) setIsOpen(true); }}
              className="bg-black/60 border border-green-500/30 backdrop-blur-md rounded-lg pl-10 pr-4 py-2 text-sm text-green-50 focus:outline-none focus:border-green-500 w-64 placeholder:text-green-500/30 transition-colors" />
            <SearchDropdown />
          </div>
        </div>
      </div>

      {/* ── Mobile layout (< lg) ─────────────────────────────────────────── */}
      <div className="flex lg:hidden flex-col gap-2 pointer-events-auto">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-black/70 border border-green-500/30 backdrop-blur-md px-3 py-2 rounded-lg text-green-400 font-mono font-bold text-sm tracking-wider">
            <Globe2 className="w-4 h-4" />
            KALSHIVERSE
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.open('https://dexscreener.com/solana/chcvntbwiudh9zz1uhyhnge9d82bsvw6ekgkblguc9af', '_blank', 'noopener,noreferrer')}
              className="bg-black/70 border border-green-500/30 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-green-400 font-mono text-xs flex items-center gap-1.5 hover:bg-green-500/10 transition-colors">
              $KLVS <span className="text-[9px] bg-green-500/20 px-1 py-0.5 rounded">LIVE</span>
            </button>
            <button onClick={() => { setMobileSearchOpen(v => !v); setMobileMenuOpen(false); }}
              className={`p-2 backdrop-blur-md rounded-lg border transition-colors ${mobileSearchOpen ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-black/70 border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
              <Search className="w-4 h-4" />
            </button>
            <button onClick={() => { setMobileMenuOpen(v => !v); setMobileSearchOpen(false); }}
              className={`p-2 backdrop-blur-md rounded-lg border transition-colors ${mobileMenuOpen ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-black/70 border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {mobileSearchOpen && (
          <div className="relative" ref={wrapperRef}>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-green-500/50 z-10" />
            <input ref={mobileSearchRef} type="text" placeholder="Search markets..."
              value={query} onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-black/80 border border-green-500/30 backdrop-blur-md rounded-lg pl-9 pr-4 py-2.5 text-sm text-green-50 focus:outline-none focus:border-green-500 placeholder:text-green-500/30 transition-colors" />
            <SearchDropdown />
          </div>
        )}

        {/* Mobile nav grid */}
        {mobileMenuOpen && (
          <div className="grid grid-cols-2 gap-2 bg-black/80 border border-green-500/20 backdrop-blur-md rounded-xl p-3">
            <button onClick={() => { onOpenLiquidity(); closeAll(); }}
              className="flex items-center justify-center gap-2 py-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm font-mono hover:bg-green-500/20 transition-colors">
              <Droplets className="w-4 h-4" /> Liquidity
            </button>
            <button onClick={() => { onOpenOsint(); closeAll(); }}
              className={`flex items-center justify-center gap-2 py-3 border rounded-lg text-sm font-mono transition-colors ${isOsintOpen ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-green-500/20 text-gray-300 hover:bg-green-500/10 hover:text-green-400'}`}>
              <Activity className="w-4 h-4" /> KalshiClaw
            </button>
            <button onClick={() => { onOpenEcosystem(); closeAll(); }}
              className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-green-500/20 text-gray-300 rounded-lg text-sm font-mono hover:bg-green-500/10 hover:text-green-400 transition-colors">
              <Layers className="w-4 h-4" /> Ecosystem
            </button>
            <button onClick={() => { onOpenPolyEarn(); closeAll(); }}
              className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-green-500/20 text-gray-300 rounded-lg text-sm font-mono hover:bg-green-500/10 hover:text-green-400 transition-colors">
              <TrendingUp className="w-4 h-4" /> PolyEarn
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
