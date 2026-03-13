import React from 'react';

export default function BottomOverlay() {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 p-6 flex items-end justify-between pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 text-gray-400 text-sm font-mono">
          trade on 
          <button
            onClick={() => window.open('https://polymarket.com', '_blank', 'noopener,noreferrer')}
            className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded flex items-center gap-2 hover:bg-blue-500/20 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Polymarket
          </button>
          and
          <button
            onClick={() => window.open('https://app.dflow.net/trade', '_blank', 'noopener,noreferrer')}
            className="bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1.5 rounded flex items-center gap-2 hover:bg-green-500/20 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Kalshi (DFlow)
          </button>
        </div>
        <div className="text-gray-500 text-xs font-mono">
          presented by <span className="text-green-500/70">xaitoshi</span>
        </div>
      </div>


    </div>
  );
}
