import type { EarningsAnalysis } from '../services/earningsService';
import type { ProAnalysis } from '../services/earningsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BG       = '#080808';
const CARD_BG  = '#0f0f0f';
const BORDER   = '#1a3a1a';
const GREEN    = '#4ade80';
const RED      = '#f87171';
const YELLOW   = '#facc15';
const GRAY     = '#6b7280';
const GRAY_DIM = '#374151';
const WHITE    = '#f3f4f6';
const BLUE     = '#60a5fa';
const ORANGE   = '#fb923c';

const CARD_W   = 480;
const CARD_PAD = 20;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function predColor(pred: string | null) {
  if (pred === 'BEAT') return GREEN;
  if (pred === 'MISS') return RED;
  return GRAY;
}

function beatRateColor(rate: number) {
  if (rate >= 70) return GREEN;
  if (rate >= 50) return YELLOW;
  return RED;
}

function signalColor(signal: string) {
  if (signal === 'BULLISH') return GREEN;
  if (signal === 'BEARISH') return RED;
  return GRAY;
}

// Draw a logo image onto canvas, returns Promise resolving when done
function drawLogoImage(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, size: number): Promise<void> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      roundRect(ctx, x, y, size, size, 6);
      ctx.clip();
      ctx.drawImage(img, x, y, size, size);
      ctx.restore();
      resolve();
    };
    img.onerror = () => resolve(); // silently skip if fails
    img.src = src;
  });
}

// ─── Measure card height for EarningsAnalysis ────────────────────────────────

function earningsCardHeight(a: EarningsAnalysis): number {
  let h = CARD_PAD * 2;
  h += 44;   // logo row
  h += 10;   // gap
  h += 18;   // beat rate label
  h += 14;   // beat rate bar
  if (a.avgSurprisePct !== 0 && a.history.length > 0) h += 22;
  if (a.polymarket && a.prediction) h += 32;
  return h;
}

// ─── Draw single EarningsCard ─────────────────────────────────────────────────

async function drawEarningsCard(
  ctx: CanvasRenderingContext2D,
  a: EarningsAnalysis,
  x: number,
  y: number,
) {
  const h = earningsCardHeight(a);

  // Card background
  ctx.fillStyle = CARD_BG;
  roundRect(ctx, x, y, CARD_W, h, 10);
  ctx.fill();

  // Card border
  const pred = a.prediction;
  ctx.strokeStyle = pred === 'BEAT' ? '#166534' : pred === 'MISS' ? '#7f1d1d' : BORDER;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, CARD_W, h, 10);
  ctx.stroke();

  let cy = y + CARD_PAD;
  const cx = x + CARD_PAD;
  const innerW = CARD_W - CARD_PAD * 2;

  // Logo placeholder
  const logoSize = 40;
  ctx.fillStyle = '#1f2937';
  roundRect(ctx, cx, cy, logoSize, logoSize, 6);
  ctx.fill();

  if (a.logo) {
    await drawLogoImage(ctx, a.logo, cx, cy, logoSize);
  } else {
    ctx.fillStyle = GRAY;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(a.symbol.charAt(0), cx + logoSize / 2, cy + logoSize / 2 + 5);
    ctx.textAlign = 'left';
  }

  // Ticker
  const textX = cx + logoSize + 12;
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 16px monospace';
  ctx.fillText(a.symbol, textX, cy + 14);

  // Company name
  if (a.name && a.name !== a.symbol) {
    ctx.fillStyle = WHITE;
    ctx.font = '12px sans-serif';
    const name = a.name.length > 28 ? a.name.slice(0, 26) + '…' : a.name;
    ctx.fillText(name, textX, cy + 30);
  }

  // Date / industry row
  let metaStr = '';
  if (a.date) metaStr += a.date;
  if (a.industry) metaStr += (metaStr ? ' · ' : '') + a.industry;
  if (metaStr) {
    ctx.fillStyle = GRAY;
    ctx.font = '10px monospace';
    ctx.fillText(metaStr, textX, cy + 44);
  }

  // Prediction badge (right side)
  if (pred) {
    const color = predColor(pred);
    const badgeW = 56;
    const badgeH = 20;
    const bx = x + CARD_W - CARD_PAD - badgeW;
    const by = cy + 2;

    ctx.fillStyle = color + '22';
    roundRect(ctx, bx, by, badgeW, badgeH, 4);
    ctx.fill();
    ctx.strokeStyle = color + '66';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, badgeW, badgeH, 4);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pred, bx + badgeW / 2, by + 14);
    ctx.textAlign = 'left';
  }

  // Polymarket badge
  if (a.polymarket) {
    const bx = x + CARD_W - CARD_PAD - 56;
    const by = cy + 26;
    const badgeW = 56;
    const badgeH = 18;
    ctx.fillStyle = '#1e3a5f';
    roundRect(ctx, bx, by, badgeW, badgeH, 4);
    ctx.fill();
    ctx.strokeStyle = '#3b82f6' + '66';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, badgeW, badgeH, 4);
    ctx.stroke();

    const pctColor = a.polymarket.yesPct >= 50 ? GREEN : RED;
    ctx.fillStyle = pctColor;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${a.polymarket.yesPct.toFixed(0)}%`, bx + badgeW / 2, by + 13);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#60a5fa88';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('POLY', bx + badgeW / 2, by + 7);
    ctx.textAlign = 'left';
  }

  cy += logoSize + 14;

  // Beat rate
  ctx.fillStyle = GRAY;
  ctx.font = '9px monospace';
  ctx.fillText(`BEAT RATE`, cx, cy);

  const totalQ = a.history.length;
  const histStr = totalQ > 0
    ? `${a.beatCount}B / ${a.missCount}M of ${totalQ}Q`
    : 'No history';
  ctx.fillStyle = GRAY_DIM;
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(histStr, x + CARD_W - CARD_PAD, cy);
  ctx.textAlign = 'left';

  cy += 8;

  // Beat rate bar
  const barH = 6;
  ctx.fillStyle = '#1f2937';
  roundRect(ctx, cx, cy, innerW, barH, 3);
  ctx.fill();

  if (totalQ > 0) {
    const barFill = Math.max(2, Math.min(innerW, (a.beatRate / 100) * innerW));
    ctx.fillStyle = beatRateColor(a.beatRate);
    roundRect(ctx, cx, cy, barFill, barH, 3);
    ctx.fill();

    ctx.fillStyle = WHITE;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${a.beatRate.toFixed(0)}%`, x + CARD_W - CARD_PAD, cy + 12);
    ctx.textAlign = 'left';
  }

  cy += barH + 10;

  // Avg surprise
  if (a.avgSurprisePct !== 0 && a.history.length > 0) {
    ctx.fillStyle = GRAY;
    ctx.font = '9px monospace';
    ctx.fillText('Avg Surprise:', cx, cy + 10);
    ctx.fillStyle = a.avgSurprisePct >= 0 ? GREEN : RED;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(
      `${a.avgSurprisePct >= 0 ? '+' : ''}${a.avgSurprisePct.toFixed(1)}%`,
      cx + 82,
      cy + 10,
    );
    cy += 22;
  }

  // AI vs Market row
  if (a.polymarket && a.prediction) {
    ctx.fillStyle = '#111827';
    roundRect(ctx, cx, cy, innerW, 26, 4);
    ctx.fill();
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    roundRect(ctx, cx, cy, innerW, 26, 4);
    ctx.stroke();

    ctx.fillStyle = GRAY;
    ctx.font = '8px monospace';
    ctx.fillText('AI vs MARKET', cx + 6, cy + 10);

    ctx.fillStyle = predColor(a.prediction);
    ctx.font = 'bold 11px monospace';
    ctx.fillText(a.prediction, cx + 6, cy + 22);

    ctx.fillStyle = GRAY_DIM;
    ctx.font = '10px monospace';
    ctx.fillText('vs', cx + 52, cy + 22);

    const polyPct = a.polymarket.yesPct;
    ctx.fillStyle = polyPct >= 50 ? BLUE : ORANGE;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${polyPct.toFixed(0)}% beat`, cx + 68, cy + 22);

    const aligned = (a.prediction === 'BEAT') === (polyPct >= 50);
    ctx.fillStyle = aligned ? '#16a34a33' : '#ea580c33';
    roundRect(ctx, cx + innerW - 70, cy + 4, 64, 18, 3);
    ctx.fill();
    ctx.fillStyle = aligned ? GREEN : ORANGE;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(aligned ? 'ALIGNED' : 'DIVERGENT', cx + innerW - 38, cy + 17);
    ctx.textAlign = 'left';
    cy += 32;
  }
}

// ─── Measure ProCard height ───────────────────────────────────────────────────

function proCardHeight(a: ProAnalysis): number {
  let h = CARD_PAD * 2;
  h += 44;  // logo row
  h += 12;  // gap
  h += 14;  // metrics row: trend dots + beat rate + IV etc.
  h += 8;
  h += 18;  // signal factors label
  h += a.signalFactors.length * 20;
  return h;
}

// ─── Draw single ProCard ──────────────────────────────────────────────────────

async function drawProCard(
  ctx: CanvasRenderingContext2D,
  a: ProAnalysis,
  x: number,
  y: number,
) {
  const h = proCardHeight(a);
  const color = signalColor(a.signal);

  ctx.fillStyle = CARD_BG;
  roundRect(ctx, x, y, CARD_W, h, 10);
  ctx.fill();

  ctx.strokeStyle = color + '55';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, CARD_W, h, 10);
  ctx.stroke();

  let cy = y + CARD_PAD;
  const cx = x + CARD_PAD;
  const innerW = CARD_W - CARD_PAD * 2;

  // Logo
  const logoSize = 40;
  ctx.fillStyle = '#1f2937';
  roundRect(ctx, cx, cy, logoSize, logoSize, 6);
  ctx.fill();
  if (a.logo) await drawLogoImage(ctx, a.logo, cx, cy, logoSize);
  else {
    ctx.fillStyle = GRAY;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(a.symbol.charAt(0), cx + logoSize / 2, cy + logoSize / 2 + 5);
    ctx.textAlign = 'left';
  }

  const textX = cx + logoSize + 12;
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 16px monospace';
  ctx.fillText(a.symbol, textX, cy + 14);

  if (a.name && a.name !== a.symbol) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px sans-serif';
    const name = a.name.length > 28 ? a.name.slice(0, 26) + '…' : a.name;
    ctx.fillText(name, textX, cy + 29);
  }

  if (a.date) {
    ctx.fillStyle = GRAY;
    ctx.font = '10px monospace';
    ctx.fillText(a.date, textX, cy + 43);
  }

  // Signal badge (top right)
  const scoreStr = a.signalScore > 0 ? `+${a.signalScore}` : `${a.signalScore}`;
  const bw = 48; const bh = 44;
  const bx = x + CARD_W - CARD_PAD - bw;
  const by = cy;
  ctx.fillStyle = color + '22';
  roundRect(ctx, bx, by, bw, bh, 6);
  ctx.fill();
  ctx.strokeStyle = color + '55';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, bh, 6);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(a.signal, bx + bw / 2, by + 12);
  ctx.font = 'bold 20px monospace';
  ctx.fillText(scoreStr, bx + bw / 2, by + 34);
  ctx.fillStyle = GRAY;
  ctx.font = '8px monospace';
  ctx.fillText('/10', bx + bw / 2, by + 44);
  ctx.textAlign = 'left';

  cy += logoSize + 14;

  // Metrics row
  let mx = cx;
  if (a.polymarket) {
    ctx.fillStyle = a.polymarket.yesPct >= 50 ? GREEN : RED;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${a.polymarket.yesPct.toFixed(0)}%`, mx, cy + 10);
    ctx.fillStyle = '#60a5fa';
    ctx.font = '9px monospace';
    ctx.fillText(' POLY', mx + 28, cy + 10);
    mx += 80;
  }
  if (a.history.length > 0) {
    ctx.fillStyle = GRAY;
    ctx.font = '10px monospace';
    ctx.fillText(`${a.beatRate.toFixed(0)}% beat`, mx, cy + 10);
    mx += 70;
  }
  if (a.optionsIV?.atmIV != null) {
    const ivColor = a.optionsIV.atmIV < 30 ? '#16a34a' : a.optionsIV.atmIV < 50 ? '#ca8a04' : RED;
    ctx.fillStyle = ivColor;
    ctx.font = '10px monospace';
    ctx.fillText(`IV ${a.optionsIV.atmIV.toFixed(0)}%`, mx, cy + 10);
    mx += 60;
  }

  cy += 22;

  // Signal factors
  ctx.fillStyle = GRAY;
  ctx.font = '9px monospace';
  ctx.fillText('SIGNAL FACTORS', cx, cy);
  cy += 14;

  for (const f of a.signalFactors) {
    ctx.fillStyle = '#374151';
    ctx.font = '10px monospace';
    ctx.fillText(f.label, cx, cy + 10);

    // mini bar
    const barX = cx + 116;
    const barW = innerW - 116 - 46;
    ctx.fillStyle = '#1f2937';
    roundRect(ctx, barX, cy + 2, barW, 8, 2);
    ctx.fill();

    if (f.score !== 0) {
      const pct = ((f.score + 2) / 4);
      ctx.fillStyle = f.score > 0 ? '#16a34a' : '#dc2626';
      roundRect(ctx, barX, cy + 2, Math.max(4, barW * pct), 8, 2);
      ctx.fill();
    }

    const fColor = f.score > 0 ? GREEN : f.score < 0 ? RED : GRAY;
    ctx.fillStyle = fColor;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(f.score > 0 ? `+${f.score}` : `${f.score}`, x + CARD_W - CARD_PAD, cy + 11);
    ctx.textAlign = 'left';

    cy += 20;
  }
}

// ─── Public export function ───────────────────────────────────────────────────

export type ExportableCard =
  | { type: 'earnings'; data: EarningsAnalysis }
  | { type: 'pro'; data: ProAnalysis };

export async function exportCardsAsImage(cards: ExportableCard[]) {
  if (cards.length === 0) return;

  const COLS = Math.min(2, cards.length);
  const GAP = 16;
  const HEADER_H = 64;
  const FOOTER_H = 36;
  const OUTER_PAD = 24;

  // Calculate heights per card
  const heights = cards.map(c =>
    c.type === 'earnings' ? earningsCardHeight(c.data as EarningsAnalysis) : proCardHeight(c.data as ProAnalysis),
  );

  // Layout in rows of COLS
  const rows: number[][] = [];
  for (let i = 0; i < cards.length; i += COLS) {
    rows.push(heights.slice(i, i + COLS));
  }
  const rowHeights = rows.map(r => Math.max(...r));
  const totalH = HEADER_H + rowHeights.reduce((s, h) => s + h + GAP, 0) + FOOTER_H + OUTER_PAD * 2;
  const totalW = OUTER_PAD * 2 + CARD_W * COLS + GAP * (COLS - 1);

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, totalW, totalH);

  // Header
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 18px monospace';
  ctx.fillText('POLYEARN // EARNINGS OUTLOOK', OUTER_PAD, OUTER_PAD + 22);

  ctx.fillStyle = GRAY;
  ctx.font = '11px monospace';
  ctx.fillText(
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    OUTER_PAD,
    OUTER_PAD + 42,
  );

  // Divider line
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(OUTER_PAD, OUTER_PAD + 50);
  ctx.lineTo(totalW - OUTER_PAD, OUTER_PAD + 50);
  ctx.stroke();

  // Cards
  let rowY = OUTER_PAD + HEADER_H;
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const rowH = rowHeights[rowIdx];
    for (let colIdx = 0; colIdx < COLS; colIdx++) {
      const cardIdx = rowIdx * COLS + colIdx;
      if (cardIdx >= cards.length) break;
      const cardX = OUTER_PAD + colIdx * (CARD_W + GAP);
      const card = cards[cardIdx];
      if (card.type === 'earnings') {
        await drawEarningsCard(ctx, card.data as EarningsAnalysis, cardX, rowY);
      } else {
        await drawProCard(ctx, card.data as ProAnalysis, cardX, rowY);
      }
    }
    rowY += rowH + GAP;
  }

  // Footer
  ctx.fillStyle = '#1f2937';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('KALSHIVERSE.COM', totalW - OUTER_PAD, totalH - OUTER_PAD);
  ctx.textAlign = 'left';

  // Download
  const link = document.createElement('a');
  link.download = `polyearn-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
