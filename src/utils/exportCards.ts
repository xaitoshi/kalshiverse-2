// Dynamically loads html2canvas from CDN on first use
async function loadHtml2Canvas(): Promise<any> {
  if ((window as any).html2canvas) return (window as any).html2canvas;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => resolve((window as any).html2canvas);
    script.onerror = () => reject(new Error('Failed to load html2canvas'));
    document.head.appendChild(script);
  });
}

export async function exportCardsAsImage(elements: HTMLElement[]) {
  if (elements.length === 0) return;

  const h2c = await loadHtml2Canvas();

  // Capture each card at 1.5× — 2× causes memory failures on mobile
  const canvases: HTMLCanvasElement[] = await Promise.all(
    elements.map(el =>
      h2c(el, {
        backgroundColor: '#0a0a0a',
        useCORS: true,
        scale: 1.5,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        imageTimeout: 5000,
        onclone: (doc: Document) => {
          // Replace any img that would fail CORS with a blank placeholder
          doc.querySelectorAll('img').forEach((img: HTMLImageElement) => {
            img.crossOrigin = 'anonymous';
          });
        },
      }),
    ),
  );

  const COLS      = Math.min(2, canvases.length);
  const GAP       = 16;
  const OUTER_PAD = 24;
  const HEADER_H  = 58;
  const FOOTER_H  = 30;

  // Group into rows
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

  // Download via blob URL (more reliable than toDataURL for large images)
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
