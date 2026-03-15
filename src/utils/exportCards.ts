import { toCanvas } from 'html-to-image';

async function captureElement(el: HTMLElement): Promise<HTMLCanvasElement> {
  const opts = {
    backgroundColor: '#0a0a0a',
    pixelRatio: 1.5,
    skipFonts: true,
    // Skip external images that will fail CORS — logos show blank instead of crashing
    filter: (node: Node) => {
      if (node instanceof HTMLImageElement && node.src.startsWith('http')) return false;
      return true;
    },
  };
  return toCanvas(el, opts);
}

export async function exportCardsAsImage(elements: HTMLElement[]) {
  if (elements.length === 0) return;

  const canvases: HTMLCanvasElement[] = await Promise.all(
    elements.map(el => captureElement(el)),
  );

  const COLS      = Math.min(2, canvases.length);
  const GAP       = 16;
  const OUTER_PAD = 24;
  const HEADER_H  = 58;
  const FOOTER_H  = 30;

  const rows: HTMLCanvasElement[][] = [];
  for (let i = 0; i < canvases.length; i += COLS) rows.push(canvases.slice(i, i + COLS));

  const cardW      = canvases[0].width;
  const rowHeights = rows.map(r => Math.max(...r.map(c => c.height)));
  const totalW     = OUTER_PAD * 2 + cardW * COLS + GAP * (COLS - 1);
  const totalH     = OUTER_PAD * 2 + HEADER_H + rowHeights.reduce((s, h) => s + h + GAP, 0) + FOOTER_H;

  const final = document.createElement('canvas');
  final.width  = totalW;
  final.height = totalH;
  const ctx = final.getContext('2d')!;

  // Background
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, totalW, totalH);

  // Header
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('POLYEARN // EARNINGS OUTLOOK', OUTER_PAD, OUTER_PAD + 22);
  ctx.fillStyle = '#6b7280';
  ctx.font = '18px monospace';
  ctx.fillText(
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    OUTER_PAD,
    OUTER_PAD + 44,
  );

  // Divider
  ctx.strokeStyle = '#1a3a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(OUTER_PAD, OUTER_PAD + 54);
  ctx.lineTo(totalW - OUTER_PAD, OUTER_PAD + 54);
  ctx.stroke();

  // Cards
  let rowY = OUTER_PAD + HEADER_H;
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    for (let ci = 0; ci < row.length; ci++) {
      const x = OUTER_PAD + ci * (cardW + GAP);
      ctx.drawImage(row[ci], x, rowY);
    }
    rowY += rowHeights[ri] + GAP;
  }

  // Footer
  ctx.fillStyle = '#374151';
  ctx.font = '18px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('KALSHIVERSE.COM', totalW - OUTER_PAD, totalH - 12);

  // Download
  await new Promise<void>((resolve, reject) => {
    final.toBlob(blob => {
      if (!blob) { reject(new Error('toBlob returned null')); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `polyearn-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = url;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}
